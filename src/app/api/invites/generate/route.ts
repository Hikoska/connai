import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { lead_id, stakeholders } = await req.json() as {
      lead_id: string
      stakeholders: { name: string; role: string; email?: string }[]
    }

    if (!lead_id || !Array.isArray(stakeholders) || stakeholders.length === 0) {
      return NextResponse.json({ error: 'lead_id and stakeholders array are required' }, { status: 400 })
    }

    const created: { name: string; role: string; interview_url: string }[] = []

    for (const s of stakeholders) {
      if (!s.name?.trim() || !s.role?.trim()) continue

      const tokenValue = crypto.randomUUID()

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interviews`,
        {
          method: 'POST',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            lead_id,
            stakeholder_name: s.name.trim(),
            stakeholder_role: s.role.trim(),
            status: 'pending',
            token: tokenValue,
          }),
        }
      )

      if (res.ok) {
        created.push({
          name: s.name.trim(),
          role: s.role.trim(),
          interview_url: `/interview/${tokenValue}`,
        })

        // Update status: 'sent' if email provided, else stays 'pending'
        if (s.email) {
          await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interviews?token=eq.${tokenValue}`, {
            method: 'PATCH',
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
          }).catch(() => {})
        }

        if (s.email && process.env.RESEND_API_KEY) {
          await resend.emails.send({
            from: 'Connai <invites@connai.linkgrow.io>',
            to: [s.email],
            subject: `You're invited: Digital Maturity Interview${s.name ? ' for ' + s.name : ''}`,
            html: `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
            <h2 style="color:#0D5C63;margin-bottom:8px">Your Digital Maturity Assessment</h2>
            <p>Hi ${s.name},</p>
            <p>You've been invited to share your perspective on <strong>${''}</strong> organisation's digital maturity. The interview takes about 20 minutes and is completely conversational.</p>
            <p style="margin:24px 0">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://connai.linkgrow.io'}/api/invites/track?token=${tokenValue}"
                 style="background:#0D5C63;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                Start my interview
              </a>
            </p>
            <p style="color:#666;font-size:13px">This link is personal to you. The interview is powered by Connai AI.</p>
            <p style="color:#666;font-size:13px">Built by <a href="https://linkgrow.io" style="color:#0D5C63">Linkgrow</a></p>
          </body></html>`,
          }).catch(e => console.warn('[invites/generate] Email failed for', s.name, e))
        }
      } else {
        const err = await res.text().catch(() => res.statusText)
        console.error(`[invites/generate] insert failed for ${s.name}:`, err)
      }
    }

    // Update leads.stakeholders with the parsed list
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/leads?id=eq.${lead_id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stakeholders }),
      }
    )

    return NextResponse.json({
      success: true,
      audit_url: `/audit/${lead_id}`,
      created,
    })
  } catch (err) {
    console.error('[invites/generate] unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}