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
    const body = await req.json()
    const { org, industry, role, email } = body as {
      org?: string
      industry?: string
      role?: string
      email?: string
    }

    if (!org?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'org and email are required' },
        { status: 400 }
      )
    }

    const sessionId = crypto.randomUUID()
    const domain = email.includes('@')
      ? email.split('@')[1].toLowerCase()
      : null

    const { data: lead, error: leadErr } = await sbInsert('leads', {
      session_id: sessionId,
      org_name: org.trim(),
      industry: industry?.trim() ?? null,
      role: role?.trim() ?? null,
      email: email.trim().toLowerCase(),
      email_domain: domain,
      status: 'captured',
      captured_at: new Date().toISOString(),
    })

    if (leadErr || !lead) {
      console.error('[capture] lead insert failed:', leadErr)
      return NextResponse.json(
        { error: 'Failed to save your information. Please try again.' },
        { status: 500 }
      )
    }

    // Auto-create interview session so the user lands directly in the interview
    const interviewToken = crypto.randomUUID()
    const { data: interview, error: ivErr } = await sbInsert('interviews', {
      lead_id: lead.id,
      stakeholder_name: org.trim(),
      stakeholder_role: 'Primary Contact',
      token: interviewToken,
      status: 'pending',
      stakeholder_email: email.trim().toLowerCase(),
    })

    if (ivErr || !interview) {
      console.error('[capture] interview insert failed:', ivErr)
      // Fallback: send to audit hub
      return NextResponse.json({
        success: true,
        token: lead.id,
        flow: 'audit',
      })
    }

    return NextResponse.json({
      success: true,
      token: interviewToken,
      flow: 'interview',
    })
  } catch (err) {
    console.error('[capture] unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
