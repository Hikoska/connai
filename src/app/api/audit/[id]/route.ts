import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (!SERVICE_KEY) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })

  // Fetch lead
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('id, org_name, email, captured_at, status')
    .eq('id', id)
    .single()

  if (leadErr || !lead) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch interviews for this lead
  const { data: interviews } = await supabase
    .from('interviews')
    .select('id, status, stakeholder_name, stakeholder_role, stakeholder_email, token, completed_at')
    .eq('lead_id', id)
    .order('created_at', { ascending: true })

  // Fetch report if any
  const { data: report } = await supabase
    .from('reports')
    .select('lead_id, overall_score')
    .eq('lead_id', id)
    .maybeSingle()

  return NextResponse.json({
    ...lead,
    interviews: interviews ?? [],
    report: report ?? null,
  })
}
