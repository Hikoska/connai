import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey:  process.env.GROQ_API_KEY,
})
const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey:  process.env.CEREBRAS_API_KEY ?? '',
})

const OVERALL_SECTOR_MEDIAN = 46

async function sbGet(path: string, useService = false) {
  const key = useService ? SB_SVC : SB_ANON
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

/** Server-side payment gate — queries report_payments via service role key */
async function isPaid(leadId: string): Promise<boolean> {
  if (!SB_SVC) return false
  const rows = await sbGet(
    `/report_payments?lead_id=eq.${encodeURIComponent(leadId)}&limit=1&select=id`,
    true
  )
  return Array.isArray(rows) && rows.length > 0
}

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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // ── Payment gate: disabled until Stripe connected ─────────────────────────
  // const paid = await isPaid(id)
  // if (!paid) { return NextResponse.json({ error: 'Payment required.' }, { status: 402 }) }
  // ─────────────────────────────────────────────────────────────────────────

  // 1. Lead metadata (org name + industry)
  const leadRows = await sbGet(`/leads?id=eq.${id}&select=org_name,industry&limit=1`)
  const lead = Array.isArray(leadRows) ? leadRows[0] : null
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  }

  // 2. Scores from reports table
  const repRows = await sbGet(`/reports?lead_id=eq.${id}&select=overall_score,dimension_scores&order=created_at.desc&limit=1`, true)
  const rep = Array.isArray(repRows) ? repRows[0] : null
  if (!rep?.dimension_scores) {
    return NextResponse.json({ error: 'Scores not yet generated.' }, { status: 404 })
  }

  const scores = rep.dimension_scores as Record<string, number>
  const orgName = lead.org_name ?? 'the organisation'
  const industry = lead.industry ? ` in the ${lead.industry} sector` : ''
  const industryLabel = lead.industry ?? 'comparable organisations'
  const vals = Object.values(scores) as number[]
  const overallScore = rep.overall_score ?? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  const tier = getMaturityTier(overallScore)

  // Benchmark context for prompt grounding
  const benchmarkDelta = overallScore - OVERALL_SECTOR_MEDIAN
  const benchmarkCtx = benchmarkDelta >= 0
    ? `${benchmarkDelta} points above sector median`
    : `${Math.abs(benchmarkDelta)} points below sector median`

  const dimensionList = Object.entries(scores)
    .sort(([, a], [, b]) => a - b)
    .map(([name, score]) => `- ${name}: ${score}/100`)
    .join('\n')

  const prompt = `You are a senior digital transformation consultant creating a C-suite action plan for ${orgName}${industry}.

Current maturity: ${overallScore}/100 — ${tier} tier (${benchmarkCtx} among ${industryLabel}).

Digital Maturity scores (sorted by gap priority, lowest first):
${dimensionList}

Return ONLY valid JSON with this exact structure — no commentary, no markdown:
{
  "executive_summary": "<3-sentence C-suite briefing: state current maturity tier, name the single highest-priority gap and its business impact, state the primary value opportunity if addressed in 90 days>",
  "industry_benchmark": "<1 sentence: how ${orgName} compares to ${industryLabel} benchmark of ${OVERALL_SECTOR_MEDIAN}/100, what this means competitively>",
  "quick_wins": [
    {"action": "<specific, immediately actionable item — name a tool or process>", "dimension": "<dimension>", "impact": "High", "effort": "Low"}
  ],
  "six_month": [
    {"action": "<structured programme or initiative, tied to a business outcome>", "dimension": "<dimension>", "impact": "High", "effort": "Medium"}
  ],
  "long_term": [
    {"action": "<strategic transformation initiative with measurable endpoint>", "dimension": "<dimension>", "impact": "High", "effort": "High"}
  ],
  "summary": "<consultant closing note: 2 sentences — what reaching the next maturity tier requires and the cost of inaction for ${orgName}>"
}

Rules:
- quick_wins: 3–4 items, executable in 0–30 days, specific tools or workshops (not generic advice)
- six_month: 3–4 items, structured programmes to run this quarter with named deliverables
- long_term: 2–3 items, 12–24 month strategic transformation with C-suite ownership required
- executive_summary: direct boardroom language, specific to ${orgName}'s actual scores
- All actions must be tied to the specific dimension gaps, not generic digital transformation advice`

  const tryAI = async (model: ReturnType<typeof groq>) => {
    const { text } = await generateText({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, maxTokens: 1200 })
    return text
  }

  let raw = ''
  try { raw = await tryAI(groq('llama-3.3-70b-versatile')) }
  catch {
    try { raw = await tryAI(cerebras('llama3.1-8b')) }
    catch { return NextResponse.json({ error: 'AI service unavailable. Try again shortly.' }, { status: 503 }) }
  }

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Plan generation failed' }, { status: 500 })

  try {
    return NextResponse.json(JSON.parse(match[0]))
  } catch {
    return NextResponse.json({ error: 'Plan parsing failed' }, { status: 500 })
  }
}
