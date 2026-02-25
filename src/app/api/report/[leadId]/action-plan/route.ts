import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GROQ_KEY = process.env.GROQ_API_KEY
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY

function isRateLimit(err: any): boolean {
  const msg = String(err?.message ?? '').toLowerCase()
  const s = err?.status ?? 0
  return s === 429 || msg.includes('rate limit') || msg.includes('429')
}

async function callLLM(apiKey: string, baseUrl: string, model: string, prompt: string) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 800,
    }),
  })
  if (res.status === 429) throw Object.assign(new Error('Rate limited'), { status: 429 })
  if (!res.ok) throw new Error(`LLM error ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content as string
}

export async function GET(req: NextRequest, { params }: { params: { leadId: string } }) {
  const { leadId } = params

  // Fetch the latest report for this lead
  const reportRes = await fetch(
    `${SUPABASE_URL}/rest/v1/reports?lead_id=eq.${leadId}&order=generated_at.desc&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )

  if (!reportRes.ok) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const reports: any[] = await reportRes.json()
  if (!reports.length) {
    return NextResponse.json({ error: 'No report yet' }, { status: 404 })
  }

  const report = reports[0]
  const scores: Record<string, number> = report.dimension_scores ?? {}
  const overall: number = report.overall_score ?? 0

  // Sort dimensions by score ascending (weakest first)
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => a - b)
    .map(([dim, score]) => `${dim}: ${score}/100`)
    .join('\n')

  const prompt = `You are a digital transformation advisor. Given this organisation's digital maturity scores, generate a prioritised action plan.

Overall score: ${overall}/100

Dimension scores (weakest to strongest):
${sorted}

Generate a JSON action plan with exactly this structure — no explanation, no markdown, just valid JSON:
{
  "quick_wins": [
    { "action": "...", "dimension": "...", "impact": "High|Medium", "effort": "Low" }
  ],
  "six_month": [
    { "action": "...", "dimension": "...", "impact": "High|Medium", "effort": "Medium" }
  ],
  "long_term": [
    { "action": "...", "dimension": "...", "impact": "High", "effort": "High" }
  ],
  "summary": "One-sentence executive summary of the organisation's digital maturity position."
}

Rules: 2-3 items per tier. Actions must be specific and actionable (not generic). Reference actual dimension names from the scores.`

  let text: string | null = null

  if (GROQ_KEY) {
    try {
      text = await callLLM(GROQ_KEY, 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', prompt)
    } catch (err) {
      if (!isRateLimit(err)) return NextResponse.json({ error: 'LLM error' }, { status: 500 })
    }
  }

  if (!text && CEREBRAS_KEY) {
    try {
      text = await callLLM(CEREBRAS_KEY, 'https://api.cerebras.ai/v1', 'llama3.1-8b', prompt)
    } catch {
      return NextResponse.json({ error: 'LLM unavailable' }, { status: 429 })
    }
  }

  if (!text) return NextResponse.json({ error: 'No LLM configured' }, { status: 500 })

  try {
    const plan = JSON.parse(text.trim())
    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ error: 'Invalid plan format from LLM', raw: text }, { status: 500 })
  }
}
