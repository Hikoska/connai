import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { helpful } = await request.json()

  if (typeof helpful !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }

  const supabase = createClient()
  const { error } = await supabase.from('report_feedback').insert({
    report_id: params.id,
    helpful,
  })

  if (error) {
    console.error('Feedback insert error:', error)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
