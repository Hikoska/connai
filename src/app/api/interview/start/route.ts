import { NextRequest, NextResponse } from 'next/server'
import { getInterviewModel } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { interview_id, subject_name, subject_role, org_context } = await req.json()

  const model = getInterviewModel()
  const chat = model.startChat()

  const openingPrompt = `You are beginning an interview with ${subject_name || 'a team member'}, who works as ${subject_role || 'a team member'}. 
Organisation context: ${org_context || 'Digital transformation audit'}
Start with a warm, professional greeting and your first open-ended question about their daily work and the tools they use.`

  const result = await chat.sendMessage(openingPrompt)
  const message = result.response.text()

  // Save to transcript
  const supabase = createClient()
  await supabase.from('transcripts').insert({
    interview_id,
    role: 'ai',
    content: message,
    sequence_num: 0,
  })

  return NextResponse.json({ message })
}
