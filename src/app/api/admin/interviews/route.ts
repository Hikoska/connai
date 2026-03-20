import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_SECRET = process.env.ADMIN_SECRET

function isAuthorized(req: NextRequest): boolean {
  const h = req.headers.get('x-admin-secret')
  if (ADMIN_SECRET && h === ADMIN_SECRET) return true
  const a = req.headers.get('authorization')
  if (ADMIN_SECRET && a === `Bearer ${ADMIN_SECRET}`) return true
  return false
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(ip, 'admin-interviews', 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!SERVICE_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/interviews?select=id,stakeholder_email,stakeholder_name,stakeholder_role,status,created_at,completed_at,lead_id&order=created_at.desc&limit=200`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  if (!res.ok) return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
  return NextResponse.json(await res.json(), { headers: { 'Cache-Control': 'no-store' } })
}
