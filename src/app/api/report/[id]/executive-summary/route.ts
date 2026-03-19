import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 45

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY })
const cerebras = createOpenAI({ baseURL: 'https://api.cerebras.ai/v1', apiKey: process.env.CEREBRAS_API_KEY ?? '' })

function getMaturityTier(score: number): string {
  if (score >= 91) return 'Digital Leader'
  if (score >= 76) return 'Advanced'
  if (score >= 61) return 'Established'
  if (score >= 41) return 'Developing'
  if (score >= 21) return 'Emerging'
  return 'Digitally Dormant'
}

async function withFallback(prompt: string, maxTokens = 1400): Promise<string> {
  const models = [groq('qwen-qwq-32b'), groq('llama-3.3-70b-versatile'), cerebras('llama3.1-8b'), groq('llama-3.1-8b-instant')]
  for (const model of models) {
    try {
      const { text } = await generateText({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, maxTokens })
      if (text && text.trim().length > 30) return text.trim()
    } catch { continue }
  }
  throw new Error('All AI providers failed')
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(ip, 'exec-summary', 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await params
  const key = SB_SVC || SB_ANON

  const leadRes = await fetch(
    `${SB_URL}/rest/v1/leads?id=eq.${id}&select=org_name,industry&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }, cache: 'no-store' }
  )
  if (!leadRes.ok) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  const leadRows = await leadRes.json()
  const lead = Array.isArray(leadRows) ? leadRows[0] : null
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const repRes = await fetch(
    `${SB_URL}/rest/v1/reports?lead_id=eq.${id}&select=overall_score,dimension_scores,executive_summary&order=created_at.desc&limit=1`,
    { headers: { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, Accept: 'application/json' }, cache: 'no-store' }
  )
  if (!repRes.ok) return NextResponse.json({ error: 'Scores not ready' }, { status: 404 })
  const repRows = await repRes.json()
  const rep = Array.isArray(repRows) ? repRows[0] : null

  if (!rep?.dimension_scores) {
    return NextResponse.json({ summary: 'This organisation has completed a Connai digital maturity assessment. Scores are being calculated \u2014 please refresh in a moment.' })
  }

  if (rep.executive_summary && rep.executive_summary.length > 100) {
    return NextResponse.json({ summary: rep.executive_summary, tier: getMaturityTier(rep.overall_score ?? 50) })
  }

  const scores = rep.dimension_scores as Record<string, number>
  const overall = (rep.overall_score as number) ?? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)
  const tier = getMaturityTier(overall)
  const orgName = lead.org_name ?? 'the organisation'
  const industry = lead.industry ?? 'their sector'

  const sortedDims = Object.entries(scores).sort(([, a], [, b]) => (a as number) - (b as number))
  const topGaps = sortedDims.slice(0, 3).map(([n, s]) => `${n} (${s}/100)`).join(', ')
  const topStrengths = [...sortedDims].reverse().slice(0, 2).map(([n, s]) => `${n} (${s}/100)`).join(', ')
  const dimensionBreakdown = sortedDims.map(([n, s]) => `  ${n}: ${s}/100`).join('\n')

  const prompt = `You are a senior digital transformation partner writing an executive summary for a board-level presentation.

Client: ${orgName}
Industry: ${industry}
Overall Digital Maturity Score: ${overall}/100 \u2014 ${tier}

Dimension breakdown (sorted lowest to highest):
${dimensionBreakdown}

Top 3 capability gaps: ${topGaps}
Top 2 strengths: ${topStrengths}

Write a crisp, insightful executive summary (220-260 words) for a C-suite / board audience.

Paragraph 1 (Current State, ~120 words): Open with the overall score and tier in context. Name ${orgName}'s 2 genuine strengths backed by their scores. Then identify the 2-3 most critical structural gaps limiting digital performance. Be precise about why these gaps matter for their industry.

Paragraph 2 (Strategic Imperatives, ~120 words): Recommend 3 high-leverage interventions in priority order, each tied to a specific gap. State the expected business outcome. Close with one sentence on the competitive window \u2014 what happens if they delay 12 months.

Tone: Write like McKinsey. No bullets. No platitudes like "digital transformation journey". Direct, specific, slightly provocative where warranted.`

  try {
    const summary = await withFallback(prompt, 1400)
    return NextResponse.json({ summary, tier })
  } catch {
    return NextResponse.json({ summary: `${orgName} has achieved an overall digital maturity score of ${overall}/100 placing them in the ${tier} tier. Key strengths: ${topStrengths}. Priority gaps: ${topGaps}.`, tier })
  }
}
