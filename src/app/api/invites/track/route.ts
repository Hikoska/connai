import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SB_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SVC_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://connai.linkgrow.io'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(`${APP_URL}/404`)

  // Fire-and-forget: log link_opened_at and upgrade status pending→sent→opened
  fetch(`${SB_URL}/rest/v1/interviews?token=eq.${token}&status=in.(pending,sent)`, {
    method: 'PATCH',
    headers: {
      apikey: SVC_KEY,
      Authorization: `Bearer ${SVC_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      link_opened_at: new Date().toISOString(),
      status: 'opened',
    }),
  }).catch(() => { /* non-fatal */ })

  return NextResponse.redirect(`${APP_URL}/interview/${token}`)
}
