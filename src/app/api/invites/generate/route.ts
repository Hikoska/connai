import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { lead_id, stakeholders } = await req.json() as {
      lead_id: string
      stakeholders: { name: string; role: string }[]
    }

    if (!lead_id || !Array.isArray(stakeholders) || stakeholders.length === 0) {
      return NextResponse.json({ error: 'lead_id and stakeholders array are required' }, { status: 400 })
    }

    const created: { name: string; role: string; interview_url: string }[] = []

    for (const s of stakeholders) {
      if (!s.name?.trim() || !s.role?.trim()) continue

      const interview_token = crypto.randomUUID()

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
            stakeholder_email: null,
            status: 'pending',
            interview_token,
          }),
        }
      )

      if (res.ok) {
        created.push({
          name: s.name.trim(),
          role: s.role.trim(),
          interview_url: `/interview/${interview_token}`,
        })
      } else {
        const err = await res.text().catch(() => res.statusText)
        console.error(`[invites/generate] insert failed for ${s.name}:`, err)
      }
    }

    // Also update leads.stakeholders with the parsed list
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
