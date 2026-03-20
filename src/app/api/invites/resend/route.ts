import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function sbGet(table: string, params: Record<string, string>) {
  const url = new URL(`${SB_URL}/rest/v1/${table}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      apikey: SB_SERVICE,
      Authorization: `Bearer ${SB_SERVICE}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`${table} fetch failed`)
  const rows = await res.json()
  return Array.isArray(rows) ? rows[0] ?? null : rows
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json() as { token?: string }
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    // Fetch interview by token — include lead_id for org lookup
    const iv = await sbGet('interviews', {
      token: `eq.${token}`,
      select: 'id,token,lead_id,stakeholder_name,stakeholder_email,status',
      limit: '1',
    })

    if (!iv) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    if (iv.status === 'complete') {
      return NextResponse.json({ error: 'Interview already completed' }, { status: 400 })
    }

    if (!iv.stakeholder_email) {
      return NextResponse.json({ error: 'No email address on record for this stakeholder' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
    }

    // Fetch org name for email personalisation
    let orgName = 'your organisation'
    if (iv.lead_id) {
      try {
        const lead = await sbGet('leads', {
          id: `eq.${iv.lead_id}`,
          select: 'org_name',
          limit: '1',
        })
        if (lead?.org_name) orgName = lead.org_name
      } catch { /* non-fatal */ }
    }

    const interviewUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://connai.linkgrow.io'}/api/invites/track?token=${token}`

    await resend.emails.send({
      from: 'Connai <invites@connai.linkgrow.io>',
      to: [iv.stakeholder_email],
      subject: `Reminder: Your Digital Maturity Interview \u2014 ${orgName}`,
      html: `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a"><h2 style="color:#0D5C63;margin-bottom:8px">Digital Maturity Assessment &mdash; Friendly Reminder</h2><p>Hi ${iv.stakeholder_name},</p><p>Just a quick reminder that your digital maturity interview for <strong>${orgName}</strong> is waiting for you. It takes about 20 minutes and can be done from any device.</p><p style="margin:24px 0"><a href="${interviewUrl}" style="background:#0D5C63;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Start my interview</a></p><p style="color:#666;font-size:13px">This link is personal to you. The interview is powered by Connai AI.</p><p style="color:#666;font-size:13px">Built by <a href="https://linkgrow.io" style="color:#0D5C63">Linkgrow</a></p></body></html>`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[invites/resend] error:', err)
    return NextResponse.json({ error: 'Failed to resend invite' }, { status: 500 })
  }
}
