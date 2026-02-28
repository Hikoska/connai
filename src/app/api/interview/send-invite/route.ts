import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connai.linkgrow.io'

export async function POST(req: Request) {
  const { interview_id } = (await req.json()) as { interview_id: string }

  if (!interview_id) {
    return NextResponse.json({ error: 'interview_id is required' }, { status: 400 })
  }

  // 1. Fetch interview row
  const ivRes = await fetch(
    `${SB_URL}/rest/v1/interviews?id=eq.${interview_id}&select=id,token,stakeholder_email,stakeholder_name,stakeholder_role,lead_id&limit=1`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: 'application/json',
      },
    }
  )
  if (!ivRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch interview' }, { status: 500 })
  }
  const rows = await ivRes.json()
  if (!rows.length) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }
  const interview = rows[0]

  const { token, stakeholder_email, stakeholder_name } = interview
  if (!stakeholder_email) {
    return NextResponse.json({ error: 'No stakeholder email on this interview' }, { status: 400 })
  }

  // 2. Build interview URL
  const interview_url = `${APP_URL}/interview/${token}`

  // 3. Send email via Resend
  const displayName = stakeholder_name ? `, ${stakeholder_name}` : ''
  const { error: resendError } = await resend.emails.send({
    from: `ConnAI <noreply@${process.env.RESEND_DOMAIN ?? 'connai.linkgrow.io'}>`,
    to: stakeholder_email,
    subject: 'Your Digital Maturity Interview',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2>You've been invited to a Digital Maturity Interview</h2>
        <p>Hello${displayName},</p>
        <p>You have been selected to participate in a quick digital maturity assessment interview. It takes approximately 5–10 minutes.</p>
        <p style="margin:24px 0;">
          <a href="${interview_url}"
             style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
            Start Your Interview
          </a>
        </p>
        <p style="color:#666;font-size:13px;">Or copy this link: ${interview_url}</p>
        <p style="color:#666;font-size:13px;">This link is unique to you. Please do not share it.</p>
      </div>
    `,
  })

  if (resendError) {
    console.error('[send-invite] Resend error:', resendError)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true, interview_url })
}
