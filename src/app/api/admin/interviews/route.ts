import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET() {
  if (!SERVICE_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/interviews?select=id,stakeholder_email,organisation,country,industry,status,created_at,completed_at&order=created_at.desc&limit=200`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    }
  )

  if (!res.ok) return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
  return NextResponse.json(await res.json())
}
