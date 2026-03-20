import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(ip, 'report-feedback', 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const { helpful } = await request.json()

  if (typeof helpful !== 'boolean') {
    return NextResponse.json({ error: 'helpful must be boolean' }, { status: 400 })
  }

  const { id } = await params
  const supabase = await createClient()
  await supabase.from('report_feedback').insert({ report_id: id, helpful })

  return NextResponse.json({ ok: true })
}
