import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

// IMPORTANT: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in Vercel environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: Request) {
  const { stakeholder_email, organisation, country, industry } = await request.json()

  if (!stakeholder_email || !organisation) {
    return NextResponse.json({ error: 'stakeholder_email and organisation are required' }, { status: 400 })
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase service role key is not configured.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const interview_token = uuidv4()

  const { data, error } = await fetch(`${SUPABASE_URL}/rest/v1/interviews`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      token: interview_token,
      stakeholder_email,
      organisation,
      country: country || 'MU',
      industry,
      status: 'pending',
    }),
  }).then(res => res.ok ? { data: true, error: null } : { data: null, error: res.statusText })

  if (error) {
    console.error('Error creating interview in Supabase:', error)
    return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Interview created successfully',
    interview_token: interview_token,
  })
}
