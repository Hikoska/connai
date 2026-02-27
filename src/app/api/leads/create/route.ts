import { NextResponse } from 'next/server'

async function sbInsert(
  table: string,
  row: object
): Promise<{ data: any; error: string | null }> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    return { data: null, error: `${table} insert failed (${res.status}): ${msg}` }
  }
  const rows = await res.json()
  return { data: Array.isArray(rows) ? rows[0] : rows, error: null }
}

export async function POST(req: Request) {
  try {
    const { org_name, industry, role, email } = await req.json() as {
      org_name: string
      industry: string
      role: string
      email: string
    }

    if (!org_name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'org_name and email are required' }, { status: 400 })
    }

    const { data: lead, error: leadErr } = await sbInsert('leads', {
      session_id: crypto.randomUUID(),
      org_name: org_name.trim(),
      industry: industry?.trim() ?? null,
      role: role?.trim() ?? null,
      email: email.trim().toLowerCase(),
      email_domain: email.includes('@') ? email.split('@')[1].toLowerCase() : null,
      status: 'captured',
      captured_at: new Date().toISOString(),
    })

    if (leadErr || !lead) {
      console.error('[leads/create] insert failed:', leadErr)
      return NextResponse.json({ error: 'Failed to create audit record.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, lead_id: lead.id })
  } catch (err) {
    console.error('[leads/create] unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
