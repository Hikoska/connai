import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  const checks: Record<string, string> = {}
  const ts = new Date().toISOString()

  // Supabase check — lightweight REST ping
  try {
    const res = await fetch(`${SB_URL}/rest/v1/leads?select=id&limit=1`, {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    checks.supabase = res.ok ? 'ok' : `error:${res.status}`
  } catch {
    checks.supabase = 'error:timeout'
  }

  // AI check — verify key is present
  checks.ai = process.env.GROQ_API_KEY ? 'ok' : 'error:no_key'

  const allOk = Object.values(checks).every(v => v === 'ok')

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', timestamp: ts, version: 'beta', checks },
    { status: allOk ? 200 : 503 }
  )
}
