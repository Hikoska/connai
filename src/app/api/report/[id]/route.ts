import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** ReportCTA in the interview complete page polls GET /api/report/{leadId} every 3s.
 *  Returns the report object once overall_score is available, or null while still generating.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(ip, 'report-poll', 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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

  if (!res.ok) return NextResponse.json(null, { status: 404 })

  const rows = await res.json()
  const report = Array.isArray(rows) ? rows[0] : null

  if (!report || report.overall_score === undefined) {
    return NextResponse.json(null, { status: 404 })
  }

  return NextResponse.json({
    id: report.id,
    overall_score: report.overall_score,
    dimensions: report.dimension_scores ?? {},
  })
}
