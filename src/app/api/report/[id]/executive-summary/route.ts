import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})
const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY ?? '',
})

function getMaturityTier(score: number): string {
  if (score >= 91) return 'Digital Leader'
  if (score >= 76) return 'Advanced'
  if (score >= 61) return 'Established'
  if (score >= 41) return 'Developing'
  if (score >= 21) return 'Emerging'
  return 'Digitally Dormant'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const key = SB_SVC || SB_ANON

  const leadRes = await fetch(
    `${SB_URL}/rest/v1/leads?id=eq.${id}&select=org_name,industry,dimension_scores,overall_score&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
      cache: 'no-store',
    }
  )
  if (!leadRes.ok) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  const leads = await leadRes.json()
  const lead = Array.isArray(leads) ? leads[0] : null
  if (!lead?.dimension_scores) return NextResponse.json({ error: 'Scores not ready' }, { status: 404 })

  const scores = lead.dimension_scores as Record<string, number>
  const vals = Object.values(scores) as number[]
  const overallScore = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  const tier = getMaturityTier(overallScore)
  const orgName = lead.org_name ?? 'this organisation'
  const industryCtx = lead.industry ? ` in the ${lead.industry} sector` : ''

  const sortedDims = Object.entries(scores).sort(([, a], [, b]) => (b as number) - (a as number))
  const topStrengths = sortedDims.slice(0, 2).map(([name]) => name).join(' and ')
  const topGaps = [...sortedDims].reverse().slice(0, 2).map(([name]) => name).join(' and ')
  const dimensionList = sortedDims
    .map(([name, score]) => `  ${name}: ${score}/100`)
    .join('\n')

  const prompt = `You are a senior digital transformation consultant preparing a confidential maturity assessment report.

Organisation: ${orgName}${industryCtx}
Overall Maturity Score: ${overallScore}/100 — ${tier} tier

Dimension scores (highest to lowest):
${dimensionList}

Write a 2-paragraph executive summary. Use a direct, confident, consulting tone — not generic.

Paragraph 1 (current state): Describe ${orgName}'s digital maturity profile based on the scores. Highlight their strongest areas (${topStrengths}) with specific insight into what these scores mean for their business. Then name the primary gaps (${topGaps}) and explain the operational risk or missed opportunity these represent.

Paragraph 2 (path forward): Identify the 2 highest-leverage areas to address first. Be specific about the business value unlocked by closing those gaps — revenue, efficiency, competitive advantage. End with one sentence on what reaching the next maturity tier would mean for ${orgName}.

Constraints:
- No bullet points, no headers
- 200–240 words total  
- Address the organisation by name throughout
- Specific and insightful, not boilerplate consulting language`

  const tryAI = async (model: ReturnType<typeof groq>) => {
    const { text } = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 512,
    })
    return text.trim()
  }

  let summary = ''
  try {
    summary = await tryAI(groq('llama-3.3-70b-versatile'))
  } catch {
    try {
      summary = await tryAI(cerebras('llama3.1-8b'))
    } catch {
      return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
    }
  }

  return NextResponse.json({ summary, tier, overall_score: overallScore })
}
