import { NextResponse } from 'next/server'

async function sbFetch(path: string) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`
  const res = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const leads = await sbFetch(
    `leads?id=eq.${id}&select=id,org_name,email,captured_at,status&limit=1`
  )
  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const lead = leads[0]

  const interviews = await sbFetch(
    `interviews?lead_id=eq.${id}&select=id,status,stakeholder_name,stakeholder_role,stakeholder_email,token,sent_at,link_opened_at,first_message_at,completed_at&order=created_at.asc`
  )

  const reports = await sbFetch(
    `reports?lead_id=eq.${id}&select=lead_id,overall_score&limit=1`
  )

  return NextResponse.json({
    ...lead,
    interviews: interviews ?? [],
    report: reports?.[0] ?? null,
  })
}
