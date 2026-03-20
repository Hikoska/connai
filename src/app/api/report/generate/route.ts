import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'
export const maxDuration = 55

const DIMENSIONS = [
  'Digital Infrastructure',
  'Data & Analytics',
  'Customer Experience',
  'Operational Efficiency',
  'Innovation & Agility',
  'Digital Culture & Skills',
  'Cybersecurity & Risk',
  'AI & Automation Readiness',
]

function timedOut(startMs = (global as Record<string, unknown>).__reportStart as number): boolean {
  return Date.now() - startMs > 48000
}

function getMaturityTier(score: number): string {
  if (score >= 80) return 'Digital Leader'
  if (score >= 65) return 'Advanced'
  if (score >= 50) return 'Developing'
  if (score >= 35) return 'Emerging'
  return 'Foundation'
}

type AIClient = ReturnType<typeof createOpenAI>
let _client: AIClient | null = null
function getClient(): AIClient {
  if (!_client) {
    _client = createOpenAI({
      apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY ?? '',
      baseURL: process.env.AI_BASE_URL,
    })
  }
  return _client
}

async function generateWithFallback(prompt: string, maxTokens = 1200): Promise<string> {
  const models = ['claude-3-5-haiku-20241022', 'claude-3-haiku-20240307', 'gpt-4o-mini']
  for (const model of models) {
    try {
      const client = getClient()
      const { text } = await generateText({ model: client(model), prompt, maxTokens })
      if (text?.trim()) return text.trim()
    } catch { /* try next */ }
  }
  return ''
}

type ScoreMap = Record<string, number>

async function scoreDimensions(transcript: string, orgName: string, industry: string): Promise<ScoreMap> {
  const prompt = `You are a senior digital transformation consultant scoring an organisational maturity interview.

Organisation: ${orgName}
Industry: ${industry}

Transcript:
${transcript.slice(0, 5000)}

Score each dimension 0-100 based ONLY on evidence in the transcript.
If a dimension is not mentioned, score it 40 (unknown baseline).

Dimensions to score:
${DIMENSIONS.map(d => `- ${d}`).join('\n')}

Return ONLY valid JSON, no explanation:
{"Digital Infrastructure": 65, "Data & Analytics": 45, ...}`

  let raw = ''
  try { raw = await generateWithFallback(prompt, 400) }
  catch { /* fallback below */ }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
      const scores: ScoreMap = {}
      for (const dim of DIMENSIONS) {
        const val = parsed[dim]
        scores[dim] = typeof val === 'number' ? Math.min(100, Math.max(0, Math.round(val))) : 40
      }
      return scores
    }
  } catch { /* fallback */ }

  return Object.fromEntries(DIMENSIONS.map(d => [d, 40]))
}

type MessageRow = { role: string; content: string }
type InterviewRow = {
  id: string
  lead_id: string
  transcript: MessageRow[] | null
  stakeholder_role: string | null
  leads?: { org_name?: string; industry?: string; role?: string } | null
}

function buildEmailHtml(orgName: string, overallScore: number, tier: string, reportUrl: string, date: string): string {
  const teal = '#0D9488'
  const scoreColor = overallScore >= 70 ? '#10B981' : overallScore >= 50 ? '#F59E0B' : '#EF4444'
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /></head><body style="margin:0;padding:0;background:#0E1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0E1117;padding:40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#151B23;border:1px solid #1e2a36;border-radius:16px;overflow:hidden;max-width:600px;"><tr><td style="background:${teal};padding:28px 40px;"><span style="color:#fff;font-size:22px;font-weight:700;">Connai</span><span style="color:rgba(255,255,255,0.5);font-size:13px;margin-left:10px;">Digital Maturity Report</span></td></tr><tr><td style="padding:40px;"><h1 style="color:#fff;font-size:26px;font-weight:700;margin:0 0 8px;">${orgName}</h1><p style="color:#64748b;font-size:14px;margin:0 0 32px;">Digital Maturity Assessment &mdash; ${date}</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#0E1117;border:1px solid #1e2a36;border-radius:12px;margin-bottom:32px;"><tr><td style="padding:24px;border-right:1px solid #1e2a36;" width="50%" align="center"><span style="display:block;font-size:52px;font-weight:800;color:${scoreColor};line-height:1;">${overallScore}</span><span style="display:block;color:#64748b;font-size:13px;margin-top:4px;">/ 100 overall</span></td><td style="padding:24px;" width="50%" align="center"><span style="display:block;font-size:20px;font-weight:700;color:#fff;">${tier}</span><span style="display:block;color:#64748b;font-size:13px;margin-top:4px;">maturity tier</span></td></tr></table><a href="${reportUrl}" style="display:inline-block;background:${teal};color:#fff;font-weight:700;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;">View full report &rarr;</a></td></tr><tr><td style="padding:20px 40px;border-top:1px solid #1e2a36;"><p style="color:#334155;font-size:12px;margin:0;">Connai &middot; <a href="https://connai.linkgrow.io" style="color:#0D5C63;text-decoration:none;">connai.linkgrow.io</a></p></td></tr></table></td></tr></table></body></html>`
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(ip, 'report-generate', 5)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(ip, 'report-generate', 5) }
    )
  }

  ;(global as Record<string, unknown>).__reportStart = Date.now()

  let lead_id: string | undefined
  let force = false

  try {
    const body = await req.json() as { lead_id?: string; force?: boolean }
    lead_id = body.lead_id
    force = body.force === true
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })
  if (!SERVICE_KEY) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }

  const existingRes = await fetch(
    `${SB_URL}/rest/v1/reports?lead_id=eq.${lead_id}&select=id,status&order=created_at.desc&limit=1`,
    { headers, cache: 'no-store' }
  )
  if (existingRes.ok) {
    const existing = await existingRes.json()
    if (!force && Array.isArray(existing) && existing.length > 0 && existing[0].status === 'complete') {
      return NextResponse.json({ success: true, report_id: existing[0].id, lead_id, idempotent: true })
    }
  }

  const interviewsRes = await fetch(
    `${SB_URL}/rest/v1/interviews?lead_id=eq.${lead_id}&select=id,lead_id,transcript,stakeholder_role,leads(org_name,industry,role)`,
    { headers }
  )
  const interviews: InterviewRow[] = await interviewsRes.json()
  if (!interviews || interviews.length === 0) {
    return NextResponse.json({ error: 'No interviews found' }, { status: 404 })
  }

  const primary = interviews[0]
  const allMessages = interviews.flatMap(i => i.transcript || [])
  const orgName = primary.leads?.org_name || 'the organisation'
  const industry = primary.leads?.industry || 'their industry'
  const leaderRole = primary.leads?.role || ''
  const transcript = allMessages.map(m => `${m.role === 'user' ? 'Stakeholder' : 'Interviewer'}: ${m.content}`).join('\n\n')

  if (timedOut()) return NextResponse.json({ error: 'Timeout before scoring \u2014 retry', partial: true }, { status: 504 })

  const dimensionScores = await scoreDimensions(transcript, orgName, industry)

  if (timedOut()) {
    const partialScore = Math.round(Object.values(dimensionScores).reduce((a, b) => a + b, 0) / Object.values(dimensionScores).length)
    await fetch(`${SB_URL}/rest/v1/reports`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ lead_id, overall_score: partialScore, dimension_scores: dimensionScores, status: 'partial' }),
    })
    return NextResponse.json({ error: 'Timeout after scoring \u2014 partial saved, retry for full report', partial: true }, { status: 504 })
  }

  const scoreValues = Object.values(dimensionScores) as number[]
  const overallScore = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
  const tier = getMaturityTier(overallScore)
  const topGaps = Object.entries(dimensionScores).sort(([, a], [, b]) => (a as number) - (b as number)).slice(0, 2).map(([k]) => k).join(' and ')
  const topStrengths = Object.entries(dimensionScores).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 2).map(([k]) => k).join(' and ')

  const summaryPrompt = `You are a senior digital transformation consultant writing an executive summary for ${orgName}'s digital maturity assessment.

Context: ${orgName} | Industry: ${industry}${leaderRole ? ` | Senior leader role: ${leaderRole}` : ''}
Overall Score: ${overallScore}/100 (${tier})
Dimension scores: ${Object.entries(dimensionScores).map(([k, v]) => `${k}: ${v}/100`).join(', ')}
Strongest areas: ${topStrengths}
Critical gaps: ${topGaps}

Transcript (${allMessages.length} exchanges):
${transcript.slice(0, 4500)}

Write a boardroom-quality executive summary (220-260 words) for a C-suite audience.
Paragraph 1: Frame the organisation's current digital position with 2 specific strengths drawn from the transcript, then 2 critical gaps that represent the highest risk to growth.
Paragraph 2: 3 high-leverage actions in priority order \u2014 each tied to a specific dimension score. Close with the competitive risk of inaction (be direct, not generic).
Tone: direct, analytical, no hedging. No bullets, no headers, no corporate filler. Use ${orgName} by name.`

  const recommendationsPrompt = `Write 5 specific, actionable recommendations for ${orgName}.

Organisation: ${orgName} | Industry: ${industry}${leaderRole ? ` | Leader role: ${leaderRole}` : ''}
Overall: ${overallScore}/100 (${tier})
Dimension scores (lowest first): ${Object.entries(dimensionScores).sort(([,a],[,b]) => (a as number)-(b as number)).map(([k, v]) => `${k}: ${v}/100`).join(', ')}

Rules:
- Each recommendation must address a specific dimension (name it)
- Prioritise the 3 lowest-scoring dimensions
- Each item: [Action sentence]. [Business impact + expected outcome].
- Be specific to ${industry} where possible. No generic advice.
Format: numbered 1-5.`

  const [summaryText, recommendationsText] = await Promise.all([
    generateWithFallback(summaryPrompt, 650).catch(() => ''),
    generateWithFallback(recommendationsPrompt, 700).catch(() => ''),
  ])

  const reportRes = await fetch(`${SB_URL}/rest/v1/reports`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ lead_id, overall_score: overallScore, dimension_scores: dimensionScores, executive_summary: summaryText, recommendations: recommendationsText, status: 'complete' }),
  })
  const reportData = await reportRes.json()
  if (!reportRes.ok) return NextResponse.json({ error: 'Failed to save report', details: reportData }, { status: 500 })

  const reportId = reportData[0]?.id
  const reportUrl = `https://connai.linkgrow.io/report/${lead_id}`

  // Fire-and-forget: send email notification
  const emailRes = await fetch(`${SB_URL}/rest/v1/leads?id=eq.${lead_id}&select=email,org_name`, { headers })
  if (emailRes.ok) {
    const leads = await emailRes.json()
    const lead = leads?.[0]
    if (lead?.email) {
      const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      const html = buildEmailHtml(lead.org_name || orgName, overallScore, tier, reportUrl, date)
      fetch(`${SB_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: `Your Connai Digital Maturity Report is ready \u2014 ${overallScore}/100`,
          html,
        }),
      }).catch(() => {})
    }
  }

  return NextResponse.json({ success: true, report_id: reportId, lead_id, overall_score: overallScore, tier })
}
