import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 45

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

// Industry benchmark medians (aligned with INDUSTRY_MEDIANS on the client)
const SECTOR_MEDIANS: Record<string, number> = {
  'Digital Strategy & Leadership': 48,
  'Customer Experience & Digital Channels': 52,
  'Operations & Process Automation': 44,
  'Data & Analytics': 47,
  'Technology Infrastructure': 53,
  'Talent & Digital Culture': 41,
  'Innovation & Agile Delivery': 38,
  'Cybersecurity & Risk': 46,
}
const OVERALL_SECTOR_MEDIAN = 46

function getMaturityTier(score: number): string {
  if (score >= 91) return 'Digital Leader'
  if (score >= 76) return 'Advanced'
  if (score >= 61) return 'Established'
  if (score >= 41) return 'Developing'
  if (score >= 21) return 'Emerging'
  return 'Digitally Dormant'
}

function getNextTier(score: number): string {
  if (score >= 91) return 'the top echelon of Digital Leaders'
  if (score >= 76) return 'Digital Leader status'
  if (score >= 61) return 'the Advanced tier'
  if (score >= 41) return 'Established status'
  if (score >= 21) return 'the Developing tier'
  return 'Emerging status'
}

type AIModel = ReturnType<typeof groq>

async function callAI(model: AIModel, prompt: string, maxTokens = 600): Promise<string> {
  const { text } = await generateText({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.35,
    maxTokens,
  })
  return text.trim()
}

async function withFallback(prompt: string, maxTokens = 600): Promise<string> {
  try {
    return await callAI(groq('llama-3.3-70b-versatile'), prompt, maxTokens)
  } catch {
    try {
      return await callAI(cerebras('llama3.1-8b'), prompt, maxTokens)
    } catch {
      throw new Error('All AI providers failed')
    }
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const key = SB_SVC || SB_ANON

  // 1. Fetch lead metadata (org name + industry)
  const leadRes = await fetch(
    `${SB_URL}/rest/v1/leads?id=eq.${id}&select=org_name,industry&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
      cache: 'no-store',
    }
  )
  if (!leadRes.ok) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  const leadRows = await leadRes.json()
  const lead = Array.isArray(leadRows) ? leadRows[0] : null
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  // 2. Fetch scores from reports table
  const repRes = await fetch(
    `${SB_URL}/rest/v1/reports?lead_id=eq.${id}&select=overall_score,dimension_scores&order=created_at.desc&limit=1`,
    {
      headers: { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, Accept: 'application/json' },
      cache: 'no-store',
    }
  )
  if (!repRes.ok) return NextResponse.json({ error: 'Scores not ready' }, { status: 404 })
  const repRows = await repRes.json()
  const rep = Array.isArray(repRows) ? repRows[0] : null
  if (!rep?.dimension_scores) {
    return NextResponse.json({
      summary: 'This organisation has completed a ConnAI digital maturity assessment. A personalised executive summary will be generated once all dimension scores are available.',
      tier: null,
      overall_score: null,
      dimension_insights: {},
      industry_benchmark: null,
    })
  }

  const scores = rep.dimension_scores as Record<string, number>
  const vals = Object.values(scores) as number[]
  const overallScore = rep.overall_score ?? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  const tier = getMaturityTier(overallScore)
  const nextTier = getNextTier(overallScore)
  const orgName = lead.org_name ?? 'this organisation'
  const industryCtx = lead.industry ? ` in the ${lead.industry} sector` : ''
  const industryLabel = lead.industry ?? 'your sector'

  const sortedDims = Object.entries(scores).sort(([, a], [, b]) => (b as number) - (a as number))
  const topStrengths = sortedDims.slice(0, 2).map(([name]) => name).join(' and ')
  const topGaps = [...sortedDims].reverse().slice(0, 2).map(([name]) => name).join(' and ')
  const dimensionList = sortedDims
    .map(([name, score]) => `  ${name}: ${score}/100 (sector median: ${SECTOR_MEDIANS[name] ?? 46})`)
    .join('\n')

  // Compute benchmark delta
  const benchmarkDelta = overallScore - OVERALL_SECTOR_MEDIAN
  const benchmarkDirection = benchmarkDelta >= 0 ? 'above' : 'below'
  const benchmarkAbs = Math.abs(benchmarkDelta)

  // Industry benchmark sentence (returned as a standalone field for UI rendering)
  const industry_benchmark = `${orgName} scores ${overallScore}/100 — ${benchmarkAbs} points ${benchmarkDirection} the cross-industry median of ${OVERALL_SECTOR_MEDIAN}, placing them in the ${tier} tier among ${industryLabel} organisations.`

  const summaryPrompt = `You are a senior digital transformation consultant preparing a confidential board-level maturity assessment.

Organisation: ${orgName}${industryCtx}
Overall Maturity Score: ${overallScore}/100 — ${tier} tier (sector median: ${OVERALL_SECTOR_MEDIAN}/100)

Dimension scores with sector medians:
${dimensionList}

Write a 3-paragraph executive narrative. Use a direct, authoritative consulting tone — specific, not generic.

Paragraph 1 — Current State: Describe ${orgName}'s digital maturity profile based on the actual scores. Call out their two strongest dimensions (${topStrengths}) with specific insight into what these scores mean commercially. Name the primary gap areas (${topGaps}) and state the operational risk or missed revenue opportunity each represents.

Paragraph 2 — Strategic Priority: Identify the 2 highest-leverage areas to close first. Be specific about the business value unlocked — revenue uplift, cost efficiency, competitive moat, or risk reduction. Avoid generic advice; tie recommendations to the actual dimension scores.

Paragraph 3 — Leadership Imperative: State concisely what closing the priority gaps means for ${orgName}'s market position in the next 12–18 months. Name the next maturity tier (${nextTier}) and what reaching it would practically unlock for the leadership team. End with one sentence about the cost of inaction.

Constraints:
- No bullet points, no headers, no markdown
- 260–300 words total
- Address ${orgName} by name throughout
- Specific and insightful — no consulting boilerplate`

  const insightsPrompt = `You are a digital maturity expert interpreting assessment results for a C-suite audience.

For each dimension below, write exactly ONE sentence (max 22 words) that explains what the score means for the business. Be specific to the score — no generic advice, no "you should improve".

Scores with sector medians:
${dimensionList}

Return ONLY valid JSON (no markdown, no explanation):
{
${sortedDims.map(([name]) => `  "${name}": "one sentence here"`).join(',\n')}
}`

  // Run both AI calls in parallel
  const [summaryResult, insightsResult] = await Promise.allSettled([
    withFallback(summaryPrompt, 600),
    withFallback(insightsPrompt, 900),
  ])

  if (summaryResult.status === 'rejected') {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }

  const summary = summaryResult.value

  let dimension_insights: Record<string, string> = {}
  if (insightsResult.status === 'fulfilled') {
    try {
      const raw = insightsResult.value
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      dimension_insights = JSON.parse(cleaned)
    } catch {
      dimension_insights = {}
    }
  }

  return NextResponse.json({ summary, tier, overall_score: overallScore, dimension_insights, industry_benchmark })
}
