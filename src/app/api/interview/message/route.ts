import { NextRequest, NextResponse } from 'next/server'
import { getInterviewModel } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { interview_id, messages } = await req.json()
  const supabase = createClient()

  const model = getInterviewModel()
  const chat = model.startChat({
    history: messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
  })

  const lastMessage = messages[messages.length - 1]
  const result = await chat.sendMessage(lastMessage.content)
  const aiResponse = result.response.text()

  // Save user message + AI response
  const seq = messages.length - 1
  await supabase.from('transcripts').insert([
    { interview_id, role: 'user', content: lastMessage.content, sequence_num: seq },
    { interview_id, role: 'ai', content: aiResponse, sequence_num: seq + 1 },
  ])

  // Check if interview should end (after ~15 exchanges)
  const is_complete = messages.length >= 28 || 
    aiResponse.toLowerCase().includes('thank you') && aiResponse.toLowerCase().includes('complete')

  if (is_complete) {
    // Trigger report generation async
    fetch(process.env.NEXT_PUBLIC_APP_URL + '/api/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interview_id }),
    }).catch(console.error)
  }

  return NextResponse.json({ message: aiResponse, is_complete })
}
