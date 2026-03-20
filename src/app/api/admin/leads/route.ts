import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

/**
 * Admin leads JSON endpoint.
 * Auth: Authorization: Bearer <admin_password>  (same password as /api/admin/auth)
 * Returns: Lead[] with nested interviews[]
 */
export async function GET(req: NextRequest) {
  // Rate limiting: simple IP check (admin route — 10 req/min is generous)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(ip, 'admin-leads', 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const auth = req.headers.get('authorization')
  const pw = auth?.startsWith('Bearer ') ? auth.slice(7) : null

  if (!ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Admin access not configured' }, { status: 503 })
  }
  if (!pw || pw !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!SERVICE_KEY) {
    return NextResponse.json({ error: 'Service key not configured' }, { status: 503 })
  }

  try {
    // Fetch leads
    const leadsRes = await fetch(
      `${SB_URL}/rest/v1/leads?select=id,org_name,email,country,industry,status,captured_at&order=captured_at.desc&limit=500`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        cache: 'no-store',
      }
    )
    if (!leadsRes.ok) {
      return NextResponse.json({ error: 'Database error fetching leads' }, { status: 500 })
    }
    const leads: Array<{
      id: string
      org_name: string
      email: string
      country?: string
      industry?: string
      status: string
      captured_at: string
    }> = await leadsRes.json()

    if (leads.length === 0) return NextResponse.json([])

    // Fetch interviews for all lead IDs in one query
    const leadIds = leads.map((l) => l.id)
    const ivRes = await fetch(
      `${SB_URL}/rest/v1/interviews?select=id,lead_id,stakeholder_name,stakeholder_role,stakeholder_email,status,token,completed_at&lead_id=in.(${leadIds.join(',')})&order=created_at.asc&limit=2000`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        cache: 'no-store',
      }
    )
    const interviews: Array<{
      id: string
      lead_id: string
      stakeholder_name?: string
      stakeholder_role?: string
      stakeholder_email?: string
      status: string
      token: string
      completed_at?: string
    }> = ivRes.ok ? await ivRes.json() : []

    // Fetch reports for all lead IDs
    const repRes = await fetch(
      `${SB_URL}/rest/v1/reports?select=lead_id,overall_score,pdf_url&lead_id=in.(${leadIds.join(',')})&limit=2000`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        cache: 'no-store',
      }
    )
    const reports: Array<{
      lead_id: string
      overall_score: number
      pdf_url?: string | null
    }> = repRes.ok ? await repRes.json() : []

    // Join interviews and reports into leads
    const ivByLead = interviews.reduce<Record<string, typeof interviews>>((acc, iv) => {
      if (!acc[iv.lead_id]) acc[iv.lead_id] = []
      acc[iv.lead_id].push(iv)
      return acc
    }, {})
    const repByLead = reports.reduce<Record<string, typeof reports[0]>>((acc, r) => {
      acc[r.lead_id] = r
      return acc
    }, {})

    const result = leads.map((l) => ({
      ...l,
      interviews: ivByLead[l.id] ?? [],
      report: repByLead[l.id] ?? null,
    }))

    return NextResponse.json(result)
  } catch (e) {
    console.error('[admin/leads] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
