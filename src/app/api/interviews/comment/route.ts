import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const { token, comment } = await req.json()
    if (!token || !comment?.trim()) return NextResponse.json({ ok: true })
    if (!SERVICE_KEY) return NextResponse.json({ ok: true })

    const res = await fetch(
      `${SB_URL}/rest/v1/interviews?token=eq.${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ stakeholder_comment: comment.trim() }),
      }
    )
    if (!res.ok && res.status !== 404) console.warn('Comment save failed:', res.status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Comment endpoint error:', err)
    return NextResponse.json({ ok: true })
  }
}
