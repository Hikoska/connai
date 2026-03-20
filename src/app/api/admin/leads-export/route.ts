import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_SECRET = process.env.ADMIN_SECRET

function isAuthorized(req: NextRequest): boolean {
  const h = req.headers.get('x-admin-secret')
  if (ADMIN_SECRET && h === ADMIN_SECRET) return true
  const a = req.headers.get('authorization')
  if (ADMIN_SECRET && a === `Bearer ${ADMIN_SECRET}`) return true
  return false
}

function csvEscape(val: unknown): string {
  const s = val == null ? '' : String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(ip, 'admin-leads-export', 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!SERVICE_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/leads?select=id,org_name,email,country,industry,status,captured_at&order=captured_at.desc&limit=5000`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return NextResponse.json({ error: 'Database error' }, { status: 500 })
    const leads = (await res.json()) as Array<{ id: string; org_name: string; email: string; country: string; industry: string; status: string; captured_at: string }>
    const header = 'id,org_name,email,country,industry,status,captured_at'
    const rows = leads.map(l => [l.id, l.org_name, l.email, l.country, l.industry, l.status, l.captured_at].map(csvEscape).join(','))
    return new NextResponse([header, ...rows].join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="connai-leads.csv"' } })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
