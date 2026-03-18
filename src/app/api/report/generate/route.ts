import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY,
})

const DIMENSIONS = [
  'Digital Strategy & Leadership',
  'Customer Experience & Digital Channels',
  'Operations & Process Automation',
  'Data & Analytics',
  'Technology Infrastructure',
  'Talent & Digital Culture',
  'Innovation & Agile Delivery',
  'Cybersecurity & Risk',
]

interface InterviewRow {
  id: string
  lead_id: string
  messages: Array<{ role: string; content: string }>
  stakeholder_role?: string
  leads: { org_name: string; industry?: string; role?: string } | null
}

// --- RACE CONDITION FIX: In-memory generation lock per lead_id ---
// Prevents concurrent requests for the same lead_id from triggering duplicate AI generation
// and duplicate DB writes. Server-side; stateless across Vercel instances but covers the
// most common single-origin burst case (e.g. double-submit from interview complete page).
const generationLocks = new Set<string>()

async function generateWithFallback(prompt: string, maxTokens = 1200): Promise<string> {
  const models = [
    { client: groq, model: 'qwen-qwq-32b' },
    { client: groq, model: 'llama-3.3-70b-versatile' },
    { client: cerebras, model: 'llama-3.3-70b' },
  ]
  for (const { client, model } of models) {
    try {
      const { text } = await generateText({ model: client(model), prompt, maxTokens })
      if (text && text.length > 20) return text
    } catch {
      continue
    }
  }
  throw new Error('All AI providers failed')
}

/** Score all 8 dimensions from the interview transcript using AI analysis */
async function scoreDimensions(
  transcript: string,
  orgName: string,
  industry: string
): Promise<Record<string, number>> {
  const prompt = `You are a senior digital transformation consultant scoring an organisational maturity interview.

Organisation: ${orgName}
Industry: ${industry}

Interview transcript:
${transcript.slice(0, 8000)}

Score each of the 8 dimensions on a scale of 0-100 using ONLY evidence from the transcript above.

Scoring guidance:
- 0-30: weak/absent - clearly lacking, no meaningful capability
- 31-50: emerging - some awareness but minimal implementation
- 51-70: developing - meaningful capability with significant gaps remaining
- 71-85: advanced - strong capability with only minor gaps
- 86-100: leading - best-in-class, fully embedded

If a dimension is not discussed at all, use 45 (unknown/neutral).
Scores must be grounded in real evidence from the transcript.

Return ONLY a JSON object, no markdown fences, no explanation:
{
  "Digital Strategy & Leadership": <integer 0-100>,
  "Customer Experience & Digital Channels": <integer 0-100>,
  "Operations & Process Automation": <integer 0-100>,
  "Data & Analytics": <integer 0-100>,
  "Technology Infrastructure": <integer 0-100>,
  "Talent & Digital Culture": <integer 0-100>,
  "Innovation & Agile Delivery": <integer 0-100>,
  "Cybersecurity & Risk": <integer 0-100>
}`

  let raw: string
  try {
    raw = await generateWithFallback(prompt, 400)
  } catch {
    return Object.fromEntries(DIMENSIONS.map(d => [d, 45]))
  }

  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    const result: Record<string, number> = {}
    for (const dim of DIMENSIONS) {
      const v = Number(parsed[dim] ?? 45)
      result[dim] = Math.max(10, Math.min(95, isNaN(v) ? 45 : Math.round(v)))
    }
    return result
  } catch {
    return Object.fromEntries(DIMENSIONS.map(d => [d, 45]))
  }
}

function getMaturityTier(score: number): string {
  if (score >= 91) return 'Digital Leader'
  if (score >= 76) return 'Advanced'
  if (score >= 61) return 'Established'
  if (score >= 41) return 'Developing'
  if (score >= 21) return 'Emerging'
  return 'Digitally Dormant'
}

function buildReportEmail(orgName: string, overallScore: number, tier: string, reportUrl: string): string {
  const teal = '#0D5C63'
  const scoreColor = overallScore >= 70 ? '#14b8a6' : overallScore >= 40 ? '#f59e0b' : '#ef4444'
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0E1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0E1117;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#151B23;border:1px solid #1e2a36;border-radius:16px;overflow:hidden;max-width:600px;">
        <tr><td style="background:${teal};padding:28px 40px;">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Connai</span>
          <span style="color:rgba(255,255,255,0.5);font-size:13px;margin-left:10px;">Digital Maturity Report</span>
        </td></tr>
        <tr><td style="padding:40px 40px 24px;">
          <p style="color:#64748b;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Your report is ready</p>
          <h1 style="color:#fff;font-size:28px;font-weight:700;margin:0 0 8px;line-height:1.2;">${orgName}</h1>
          <p style="color:#64748b;font-size:14px;margin:0 0 32px;">Digital Maturity Assessment &mdash; ${date}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0E1117;border:1px solid #1e2a36;border-radius:12px;margin-bottom:32px;">
            <tr>
              <td style="padding:28px 32px;border-right:1px solid #1e2a36;" width="50%" align="center">
                <span style="display:block;font-size:56px;font-weight:800;color:${scoreColor};line-height:1;font-variant-numeric:tabular-nums;">${overallScore}</span>
                <span style="display:block;color:#64748b;font-size:13px;margin-top:6px;">/ 100 overall score</span>
              </td>
              <td style="padding:28px 32px;" width="50%" align="center">
                <span style="display:block;font-size:20px;font-weight:700;color:#fff;line-height:1;">${tier}</span>
                <span style="display:block;color:#64748b;font-size:13px;margin-top:6px;">maturity tier</span>
              </td>
            </tr>
          </table>
          <p style="color:#94a3b8;font-size:15px;line-height:1.8;margin:0 0 32px;">Your full report includes dimension-by-dimension scoring across 8 areas of digital maturity, industry benchmarks, an AI-generated executive summary, and a prioritised action plan.</p>
          <a href="${reportUrl}" style="display:inline-block;background:${teal};color:#fff;font-weight:700;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;letter-spacing:-0.2px;">View your full report &rarr;</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #1e2a36;">
          <p style="color:#334155;font-size:12px;margin:0;">Built by <strong style="color:#475569;">Linkgrow</strong> &middot; <a href="https://connai.linkgrow.io" style="color:#0D5C63;text-decoration:none;">connai.linkgrow.io</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: Request) {
  try {
    // --- NULL GUARD: parse body safely ---
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
    }

    const { lead_id } = body as Record<string, unknown>

    // --- NULL GUARD: lead_id ---
    if (!lead_id || typeof lead_id !== 'string' || !lead_id.trim()) {
      return NextResponse.json({ error: 'lead_id required' }, { status: 400 })
    }
    if (!SERVICE_KEY) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const trimmedLeadId = lead_id.trim()

    const headers = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    }

    // --- RACE CONDITION FIX (Part 1): Idempotency check — bail if report already exists ---
    // This covers the multi-instance / Vercel cold-start case where the in-memory lock
    // would not be shared across instances.
    const existingReportRes = await fetch(
      `${SB_URL}/rest/v1/reports?lead_id=eq.${trimmedLeadId}&select=id,overall_score,status&limit=1`,
      { headers }
    )
    if (existingReportRes.ok) {
      const existingReports = await existingReportRes.json()
      if (Array.isArray(existingReports) && existingReports.length > 0) {
        const existing = existingReports[0]
        // Report already exists — return it without regenerating
        return NextResponse.json({
          success: true,
          report_id: existing.id,
          lead_id: trimmedLeadId,
          overall_score: existing.overall_score,
          already_existed: true,
        })
      }
    }

    // --- RACE CONDITION FIX (Part 2): In-memory lock for same-process concurrent requests ---
    if (generationLocks.has(trimmedLeadId)) {
      return NextResponse.json(
        { error: 'Report generation already in progress for this lead', code: 'GENERATION_IN_PROGRESS' },
        { status: 409 }
      )
    }
    generationLocks.add(trimmedLeadId)

    try {
      const interviewsRes = await fetch(
        `${SB_URL}/rest/v1/interviews?lead_id=eq.${trimmedLeadId}&select=id,lead_id,messages,stakeholder_role,leads(org_name,industry,role)`,
        { headers }
      )
      const interviews: InterviewRow[] = await interviewsRes.json()
      if (!Array.isArray(interviews) || interviews.length === 0) {
        return NextResponse.json({ error: 'No interviews found' }, { status: 404 })
      }

      const primary = interviews[0]
      // --- NULL GUARD: messages array on each interview row ---
      const allMessages = interviews.flatMap(i =>
        Array.isArray(i.messages)
          ? i.messages.filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
          : []
      )
      const orgName = primary.leads?.org_name || 'the organisation'
      const industry = primary.leads?.industry || 'their industry'

      const transcript = allMessages
        .map(m => `${m.role === 'user' ? 'Stakeholder' : 'Interviewer'}: ${m.content}`)
        .join('\n\n')

      const dimensionScores = await scoreDimensions(transcript, orgName, industry)
      const scoreValues = Object.values(dimensionScores) as number[]
      const overallScore = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
      const tier = getMaturityTier(overallScore)

      const topGaps = Object.entries(dimensionScores)
        .sort(([, a], [, b]) => (a as number) - (b as number))
        .slice(0, 2)
        .map(([k]) => k)
        .join(' and ')

      const summaryPrompt = `You are a digital transformation expert writing an executive summary for ${orgName}'s digital maturity assessment.

Overall Score: ${overallScore}/100 (${tier})
Top gaps: ${topGaps}
Industry: ${industry}
Transcript excerpt:
${transcript.slice(0, 3000)}

Write a direct 2-paragraph executive summary (150-180 words). Para 1: current state with specific strengths and gaps. Para 2: highest-leverage next steps. Use their actual language. No bullets.`

      const recommendationsPrompt = `Write 5 specific actionable recommendations for ${orgName}.
Score: ${overallScore}/100 (${tier})
Scores: ${Object.entries(dimensionScores).map(([k, v]) => `${k}: ${v}`).join(', ')}
Format: numbered list. Each: one action sentence + one business impact sentence.`

      const [summaryText, recommendationsText] = await Promise.all([
        generateWithFallback(summaryPrompt, 400).catch(() => ''),
        generateWithFallback(recommendationsPrompt, 600).catch(() => ''),
      ])

      // --- NULL GUARD: DB insert with Prefer: return=representation validation ---
      const reportRes = await fetch(`${SB_URL}/rest/v1/reports`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          lead_id: trimmedLeadId,
          overall_score: overallScore,
          dimension_scores: dimensionScores,
          executive_summary: summaryText,
          recommendations: recommendationsText,
          status: 'complete',
        }),
      })
      const reportData = await reportRes.json()
      if (!reportRes.ok) {
        return NextResponse.json({ error: 'Failed to save report', details: reportData }, { status: 500 })
      }

      // --- NULL GUARD: reportData shape ---
      const reportId = Array.isArray(reportData) ? reportData[0]?.id : reportData?.id
      if (!reportId) {
        console.error('Report saved but ID not returned:', reportData)
      }

      const leadRes = await fetch(`${SB_URL}/rest/v1/leads?id=eq.${trimmedLeadId}&select=email,org_name`, { headers })
      const leads = await leadRes.json()
      const lead = Array.isArray(leads) ? leads[0] : null
      if (lead?.email && resend) {
        const reportUrl = `https://connai.linkgrow.io/report/${trimmedLeadId}`
        try {
          await resend.emails.send({
            from: 'Connai <noreply@connai.linkgrow.io>',
            to: lead.email,
            subject: `Your Digital Maturity Report - ${lead.org_name || 'Your Organisation'} scored ${overallScore}/100`,
            html: buildReportEmail(lead.org_name || 'Your Organisation', overallScore, tier, reportUrl),
          })
        } catch { /* email is best-effort */ }
      }

      return NextResponse.json({ success: true, report_id: reportId, lead_id: trimmedLeadId, overall_score: overallScore, tier })
    } finally {
      // --- RACE CONDITION FIX: Always release the lock ---
      generationLocks.delete(trimmedLeadId)
    }
  } catch (err) {
    console.error('Report generation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
