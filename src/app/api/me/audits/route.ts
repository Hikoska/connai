import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Rate limit: 30 req/60s per IP — generous, it's just a dashboard load
  const ip = (req as Request & { headers: Headers }).headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(ip, 'me-audits', 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Get the auth token from the request
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the token and get the user
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const userEmail = user.email.toLowerCase()

  // Fetch leads for this user — include industry so dashboard card shows it
  const leadsRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/leads?email=eq.${encodeURIComponent(userEmail)}&select=id,org_name,email,status,captured_at,industry&order=captured_at.desc`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    }
  )
  const leads = leadsRes.ok ? await leadsRes.json() : []

  if (leads.length === 0) return NextResponse.json({ leads: [], interviews: [], reports: [] })

  const leadIds = leads.map((l: any) => l.id).join(',')

  // Fetch interviews + reports in parallel
  const [ivRes, repRes] = await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interviews?lead_id=in.(${leadIds})&select=id,lead_id,stakeholder_name,stakeholder_role,stakeholder_email,token,status&order=created_at.asc`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      }
    ),
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reports?lead_id=in.(${leadIds})&select=lead_id,overall_score`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      }
    ),
  ])

  const interviews = ivRes.ok ? await ivRes.json() : []
  const reports = repRes.ok ? await repRes.json() : []

  return NextResponse.json({ leads, interviews, reports })
}
