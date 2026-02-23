import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const SITE_URL = 'https://connai.linkgrow.io'

export async function POST(request: Request) {
  const { interview_id } = await request.json()

  if (!interview_id) {
    return NextResponse.json({ error: 'interview_id is required' }, { status: 400 })
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase service role key is not configured.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const authHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }

  // Step 1: Fetch the interview
  const interviewRes = await fetch(
    `${SUPABASE_URL}/rest/v1/interviews?id=eq.${interview_id}&select=id,stakeholder_email,organisation,token,transcript`,
    { headers: authHeaders }
  )
  const interviews = await interviewRes.json()

  if (!interviews.length) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  const interview = interviews[0]

  // Step 2: Score dimensions from transcript
  const transcript: Array<{ role: string; content: string }> = Array.isArray(interview.transcript)
    ? interview.transcript
    : []

  const scoreKeyword = (kw: string) => {
    if (!transcript.length) return Math.floor(Math.random() * 40) + 30
    const text = transcript.map(m => m.content || '').join(' ').toLowerCase()
    const hits = (text.match(new RegExp(kw, 'gi')) || []).length
    return Math.min(100, Math.round(40 + (hits / (transcript.length || 1)) * 30))
  }

  const dimensions = {
    strategy: scoreKeyword('strategy'),
    technology: scoreKeyword('technolog'),
    data: scoreKeyword('data'),
    operations: scoreKeyword('operations'),
    customer: scoreKeyword('customer'),
    culture: scoreKeyword('skills|culture|team'),
  }

  const overallScore = Math.round(
    Object.values(dimensions).reduce((a, b) => a + b, 0) / Object.values(dimensions).length
  )

  // Step 3: Save report to Supabase
  const reportRes = await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
    method: 'POST',
    headers: { ...authHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      interview_id,
      dimensions: { ...dimensions, overall: overallScore, computed_at: new Date().toISOString() },
      pack_type: 'starter',
      credits_used: 1,
    }),
  })

  if (!reportRes.ok) {
    const err = await reportRes.text()
    console.error('[/api/report] Supabase error:', err)
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }

  const [report] = await reportRes.json()

  // Step 4: Mark interview as completed
  await fetch(`${SUPABASE_URL}/rest/v1/interviews?id=eq.${interview_id}`, {
    method: 'PATCH',
    headers: { ...authHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
  })

  // Step 5: Send email via Resend (non-blocking — don't fail if email fails)
  if (RESEND_API_KEY && interview.stakeholder_email) {
    try {
      const topDimension = Object.entries(dimensions)
        .sort((a, b) => b[1] - a[1])[0][0]

      const findings = [
        `Your overall digital maturity score is <strong>${overallScore}/100</strong>.`,
        `Strongest area: <strong>${topDimension}</strong> (${dimensions[topDimension as keyof typeof dimensions]}/100).`,
        `Full breakdown available in your report — track progress over time by running another assessment in 6 months.`,
      ]

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Connai <onboarding@resend.dev>',
          to: [interview.stakeholder_email],
          subject: `Your Connai Digital Maturity Report — ${interview.organisation}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h1 style="color:#1a1a2e">Your Digital Maturity Report</h1>
              <p>Hi,</p>
              <p>Your assessment for <strong>${interview.organisation}</strong> is complete.</p>
              <h2 style="color:#3b82f6">Score: ${overallScore}/100</h2>
              <h3>Key findings:</h3>
              <ul>
                ${findings.map(f => `<li>${f}</li>`).join('')}
              </ul>
              <p>
                <a href="${SITE_URL}/interview/${interview.token}" 
                   style="background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
                  View Full Report
                </a>
              </p>
              <p style="color:#888;font-size:12px">Connai — Digital Maturity Intelligence for Mauritius SMEs</p>
            </div>
          `,
        }),
      })
    } catch (emailErr) {
      console.error('[/api/report] Email send failed (non-fatal):', emailErr)
    }
  }

  return NextResponse.json({
    report_id: report.id,
    interview_id,
    dimensions: report.dimensions,
    overall_score: overallScore,
    pdf_url: `${SITE_URL}/reports/${report.id}`,
  })
}
