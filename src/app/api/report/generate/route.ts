import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY ?? '',
})

function isRateLimit(error: unknown): boolean {
  if (!error) return false
  const e = error as Record<string, unknown>
  const msg = String(e?.message ?? error).toLowerCase()
  const status = (e?.status ?? (e?.cause as Record<string, unknown>)?.status) as number | undefined
  return status === 429 || msg.includes('rate limit') || msg.includes('429')
}

async function dbPost(table: string, body: Record<string, unknown>) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`DB insert failed: ${await res.text()}`)
  return res.json()
}

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

export async function POST(req: Request) {
  const body = await req.json() as { interview_id?: string; lead_id?: string }
  const { interview_id, lead_id } = body

  if (!interview_id && !lead_id) {
    return NextResponse.json({ error: 'interview_id or lead_id is required' }, { status: 400 })
  }

  // Resolve interviews and aggregate messages
  let primaryInterview: Record<string, string>
  let allMessages: { role: string; content: string }[] = []
  let transcriptContext = ''
  let resolvedLeadId: string

  if (lead_id) {
    // Multi-stakeholder: fetch ALL complete interviews for this lead
    const ivListRes = await fetch(
      `${SB_URL}/rest/v1/interviews?lead_id=eq.${lead_id}&status=eq.complete&select=id,lead_id,stakeholder_name,stakeholder_role`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
    )
    const ivList = await ivListRes.json()
    if (!ivList.length) return NextResponse.json({ error: 'No completed interviews for this lead' }, { status: 404 })

    primaryInterview = ivList[0]
    resolvedLeadId   = lead_id
    transcriptContext = ivList.map((iv: Record<string,string>) =>
      `Interview with: ${iv.stakeholder_name} (${iv.stakeholder_role})`
    ).join('; ')

    // Fetch all messages for all interviews in one query
    const ids = ivList.map((iv: Record<string,string>) => iv.id).join(',')
    const msgsRes = await fetch(
      `${SB_URL}/rest/v1/interview_messages?interview_id=in.(${ids})&select=role,content,interview_id&order=created_at.asc`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
    )
    allMessages = await msgsRes.json()
  } else {
    // Single interview (backward compat)
    const ivRes = await fetch(
      `${SB_URL}/rest/v1/interviews?id=eq.${interview_id}&select=id,lead_id,stakeholder_name,stakeholder_role,status&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
    )
    const ivRows = await ivRes.json()
    if (!ivRows.length) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    primaryInterview = ivRows[0]
    resolvedLeadId   = primaryInterview.lead_id

    const msgsRes = await fetch(
      `${SB_URL}/rest/v1/interview_messages?interview_id=eq.${interview_id}&select=role,content&order=created_at.asc`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
    )
    allMessages = await msgsRes.json()
    transcriptContext = `Interview with: ${primaryInterview.stakeholder_name} (${primaryInterview.stakeholder_role})`
  }

  if (!allMessages.length) {
    return NextResponse.json({ error: 'No messages found' }, { status: 400 })
  }

  const transcript = allMessages
    .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n---\n\n')

  const scoringPrompt = `You are a digital maturity assessment expert. Analyze the following interview transcript(s) and score the organization across ${DIMENSIONS.length} dimensions.\n\n${transcriptContext}\n\nTranscript(s):\n${transcript}\n\nScore each dimension from 0-100 based on the evidence. Return ONLY a JSON object:\n${JSON.stringify(Object.fromEntries(DIMENSIONS.map(d => [d, 0])), null, 2)}\n\nReturn only valid JSON, no explanation.`

  let dimensionScores: Record<string, number> = {}

  async function tryScore(model: ReturnType<typeof groq>) {
    const { text } = await generateText({ model, prompt: scoringPrompt, maxTokens: 512 })
    const clean = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    return JSON.parse(clean)
  }

  try {
    dimensionScores = await tryScore(groq('llama-3.3-70b-versatile'))
  } catch (err) {
    if (isRateLimit(err) && process.env.CEREBRAS_API_KEY) {
      try {
        dimensionScores = await tryScore(cerebras('llama3.1-8b'))
      } catch {
        return NextResponse.json({ error: 'LLM scoring failed (rate limited)' }, { status: 429 })
      }
    } else {
      return NextResponse.json({ error: `LLM scoring failed: ${String(err)}` }, { status: 500 })
    }
  }

  const overallScore = Math.round(
    Object.values(dimensionScores).reduce((a: number, b: number) => a + (b as number), 0) / DIMENSIONS.length
  )

  // Save report
  const reportRows = await dbPost('reports', {
    lead_id: resolvedLeadId,
    interview_id: primaryInterview.id,
    overall_score: overallScore,
    dimension_scores: dimensionScores,
    generated_at: new Date().toISOString(),
    interview_count: lead_id ? (ivList?.length ?? 1) : 1,
  })

  const reportId = reportRows[0]?.id ?? interview.lead_id

  // Send report-ready email to lead (non-fatal)
  try {
    const emailRes = await fetch(
      `${SB_URL}/rest/v1/leads?id=eq.${resolvedLeadId}&select=email,org_name&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
    )
    const emailRows = await emailRes.json()
    const leadEmail = emailRows[0]?.email
    const leadOrgName: string = emailRows[0]?.org_name ?? ''
    if (process.env.RESEND_API_KEY && leadEmail) {
      // Compute tier + accent color for styled email
      const _emailScore = overallScore
      const _emailTier =
        _emailScore >= 91 ? 'Digital Leader'  :
        _emailScore >= 76 ? 'Advanced'         :
        _emailScore >= 61 ? 'Established'      :
        _emailScore >= 41 ? 'Developing'       :
        _emailScore >= 21 ? 'Emerging'         : 'Digitally Dormant'
      const _emailColor =
        _emailScore >= 70 ? '#14b8a6' :
        _emailScore >= 40 ? '#f59e0b' : '#ef4444'
      const _siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
      const _reportUrl = `${_siteUrl}/report/${resolvedLeadId}`
      const _topDims = Object.entries(dimensionScores)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 2)
        .map(([name, score]) =>
          `<tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:13px;">${name}</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;color:#f1f5f9;font-size:13px;">${score}/100</td>
          </tr>`
        ).join('')
      const _emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0E1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0E1117;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-size:12px;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Connai &nbsp;·&nbsp; Digital Maturity Report</span>
        </td></tr>
        <tr><td style="background:#111827;border:1px solid #1e293b;border-radius:16px;padding:36px 32px;text-align:center;">
          <table align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
            <tr><td style="width:96px;height:96px;border-radius:50%;border:6px solid ${_emailColor};text-align:center;vertical-align:middle;background:#0E1117;">
              <div style="font-size:30px;font-weight:700;color:#f1f5f9;line-height:1;">${_emailScore}</div>
              <div style="font-size:10px;color:#64748b;margin-top:2px;">/ 100</div>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:21px;font-weight:700;color:#f1f5f9;">Your assessment is ready</p>
          <p style="margin:0;font-size:13px;color:#64748b;">
            Maturity tier &nbsp;·&nbsp;
            <span style="color:${_emailColor};font-weight:600;">${_emailTier}</span>
          </p>
        </td></tr>
        <tr><td style="padding-top:16px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid #1e293b;border-radius:12px;padding:20px 24px;">
            <tr><td colspan="2" style="padding-bottom:10px;">
              <span style="font-size:11px;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;">Top Strengths</span>
            </td></tr>
            ${_topDims}
          </table>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <a href="${_reportUrl}" style="display:inline-block;background:#14b8a6;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
            View Full Report →
          </a>
          <p style="margin:14px 0 0;font-size:12px;color:#475569;">
            Your complete report with all 8 dimensions and action plan:<br>
            <a href="${_reportUrl}" style="color:#14b8a6;text-decoration:none;">${_reportUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding-top:40px;text-align:center;">
          <span style="font-size:11px;color:#334155;">Built by Linkgrow &nbsp;·&nbsp; connai.linkgrow.io</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
      await resend.emails.send({
        from: 'Connai <reports@connai.linkgrow.io>',
        to: [leadEmail],
        subject: `${leadOrgName ? leadOrgName + ' — ' : ''}Digital Maturity Report: ${_emailTier} (${_emailScore}/100)`,
        html: _emailHtml,
      })
    }
  } catch (emailErr) {
    console.warn('[report/generate] Email failed (non-fatal):', emailErr)
  }

  return NextResponse.json({
    ok: true,
    lead_id: resolvedLeadId,
    report_id: reportId,
    overall_score: overallScore,
    dimensions: dimensionScores,
  })
}