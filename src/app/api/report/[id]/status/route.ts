import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** GeneratingState in the report page polls GET /api/report/{leadId}/status every 5s.
 *  Returns { ready: true, report: {...} } once the report is available.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(ip, 'report-status', 20)) {
    return NextResponse.json({ ready: false }, { status: 429 })
  }

  const { id } = await params

  const res = await fetch(
    `${SB_URL}/rest/v1/reports?lead_id=eq.${id}&select=id,overall_score,dimension_scores,status&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: SB_SVC,
        Authorization: `Bearer ${SB_SVC}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  )

  if (!res.ok) return NextResponse.json({ ready: false }, {
    headers: { 'Cache-Control': 'no-store' },
  })

  const rows = await res.json()
  const rep = Array.isArray(rows) ? rows[0] : null

  if (!rep || rep.overall_score === undefined) {
    return NextResponse.json({ ready: false }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return NextResponse.json({
    ready: true,
    report: {
      id: rep.id,
      overall_score: rep.overall_score,
      dimensions: (
        rep.dimension_scores
          ? Object.entries(rep.dimension_scores as Record<string, number>).map(
              ([name, score]) => ({ name, score }),
            )
          : []
      ),
    },
  }, {
    headers: { 'Cache-Control': 'no-store' }, // Polling route — never cache; client polls every 5s
  })
}
