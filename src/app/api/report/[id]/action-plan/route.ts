import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey:  process.env.GROQ_API_KEY,
})
const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey:  process.env.CEREBRAS_API_KEY ?? '',
})

async function sbGet(path: string) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const leadRows = await sbGet(`/leads?id=eq.${id}&select=org_name,industry,dimension_scores&limit=1`)
  const lead = Array.isArray(leadRows) ? leadRows[0] : null

  if (!lead?.dimension_scores) {
    return NextResponse.json({ error: 'Scores not yet generated. Call /preview first.' }, { status: 404 })
  }

  const scores = lead.dimension_scores as Record<string, number>
  const orgName = lead.org_name ?? 'the organisation'
  const industry = lead.industry ? ` in the ${lead.industry} sector` : ''

  const dimensionList = Object.entries(scores)
    .sort(([, a], [, b]) => a - b) // lowest first — prioritize gaps
    .map(([name, score]) => `- ${name}: ${score}/100`)
    .join('\n')

  const prompt = `You are a senior digital transformation consultant creating a prioritised action plan for ${orgName}${industry}.

Digital Maturity scores (sorted by priority gap):
${dimensionList}

Return ONLY valid JSON, no commentary:
{
  "summary": "<2-3 sentence executive summary: current maturity level, biggest gap, primary priority>",
  "quick_wins": [
    {"action": "<specific, actionable item>", "dimension": "<dimension>", "impact": "High", "effort": "Low"}
  ],
  "six_month": [
    {"action": "<specific, actionable item>", "dimension": "<dimension>", "impact": "High", "effort": "Medium"}
  ],
  "long_term": [
    {"action": "<specific, actionable item>", "dimension": "<dimension>", "impact": "High", "effort": "High"}
  ]
}

Rules:
- quick_wins: 3-4 items, 30-day actions, low effort high impact
- six_month: 3-4 items, structured programmes this quarter
- long_term: 2-3 items, strategic transformation 12-24 months
- Be specific to the organisation's gaps, not generic advice`

  const tryAI = async (model: ReturnType<typeof groq>) => {
    const { text } = await generateText({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3 })
    return text
  }

  let raw = ''
  try { raw = await tryAI(groq('llama-3.3-70b-versatile')) }
  catch { raw = await tryAI(cerebras('llama3.1-8b')) }

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Plan generation failed' }, { status: 500 })

  try {
    return NextResponse.json(JSON.parse(match[0]))
  } catch {
    return NextResponse.json({ error: 'Plan parsing failed' }, { status: 500 })
  }
}
