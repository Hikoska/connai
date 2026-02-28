import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { token, comment } = await req.json()

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/interviews?interview_token=eq.${token}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ stakeholder_comment: comment ?? null }),
    }
  )

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const updated = await res.json()
  if (!updated.length) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
