import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SB_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function csvEscape(val: unknown): string {
  const s = val == null ? '' : String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export async function GET() {
  if (!SERVICE_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/leads?select=id,org_name,email,country,industry,status,captured_at&order=captured_at.desc&limit=5000`,
      {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        cache: 'no-store',
      },
    )
    if (!res.ok) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const leads = (await res.json()) as Array<{
      id: string; org_name: string; email: string
      country: string; industry: string; status: string; captured_at: string
    }>

    const header = 'id,org_name,email,country,industry,status,captured_at'
    const rows = leads.map(l =>
      [l.id, l.org_name, l.email, l.country, l.industry, l.status, l.captured_at]
        .map(csvEscape)
        .join(','),
    )
    const csv = [header, ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="connai-leads.csv"',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
