import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY })
const cerebras = createOpenAI({ baseURL: 'https://api.cerebras.ai/v1', apiKey: process.env.CEREBRAS_API_KEY ?? '' })

async function getInterviewContext(token: string) {
  const ivRes = await fetch(
    `${SB_URL}/rest/v1/interviews?token=eq.${token}&select=id,lead_id,stakeholder_name,stakeholder_role&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
  )
  if (!ivRes.ok) return null
  const ivRows = await ivRes.json()
  if (!ivRows.length) return null
  const iv = ivRows[0]
  const leadRes = await fetch(
    `${SB_URL}/rest/v1/leads?id=eq.${iv.lead_id}&select=org_name,industry&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
  )
  const leadRows = leadRes.ok ? await leadRes.json() : []
  const lead = leadRows[0] ?? {}
  return {
    id: iv.id, lead_id: iv.lead_id,
    name: iv.stakeholder_name || 'there',
    role: iv.stakeholder_role || 'team member',
    org: lead.org_name || 'your organisation',
    industry: lead.industry ? ` in the ${lead.industry} sector` : '',
  }
}

async function generateReply(systemPrompt: string, msgs: Array<{role: string; content: string}>): Promise<string> {
  const models = [groq('qwen-qwq-32b'), groq('llama-3.3-70b-versatile'), cerebras('llama3.1-8b')]
  for (const model of models) {
    try {
      const { text } = await generateText({
        model, system: systemPrompt,
        messages: msgs as Parameters<typeof generateText>[0]['messages'],
        temperature: 0.7, maxTokens: 300,
      })
      if (text && text.trim().length > 10) return text.trim()
    } catch { continue }
  }
  return 'Thank you for sharing that. Could you tell me more about your current technology challenges?'
}

export async function POST(req: NextRequest) {
  try {
    const { token, messages } = await req.json()
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    const ctx = await getInterviewContext(token)
    if (!ctx) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    const count = (messages ?? []).length
    const isFirstMessage = count === 1
    const isDone = count >= 16

    if (isDone) {
      await fetch(`${SB_URL}/rest/v1/interviews?id=eq.${ctx.id}`, {
        method: 'PATCH',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'complete', transcript: messages }),
      })
      fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: ctx.lead_id }),
      }).catch(() => {})
      return NextResponse.json({ done: true })
    }

    const stage = count < 6 ? 'Early: Focus on strategy, leadership, customer experience.'
      : count < 12 ? 'Mid: Explore operations, data, technology infrastructure.'
      : 'Final: Cover culture, innovation, security. Start wrapping up naturally.'

    const systemPrompt = isFirstMessage
      ? `You are a senior digital transformation consultant interviewing ${ctx.name} (${ctx.role}) at ${ctx.org}${ctx.industry}. Uncover digital maturity across 8 areas: Strategy, Customer Experience, Operations, Data, Infrastructure, Talent, Innovation, Security. Tone: warm, consultative, one question at a time, 2-3 sentences max. You have 16 turns. Start by asking about their biggest digital challenge right now.`
      : `You are ${Math.round((count/16)*100)}% through a maturity interview with ${ctx.name} (${ctx.role}) at ${ctx.org}${ctx.industry}. ${stage} One question per message, 3 sentences max. Build on what they just said. Turn ${count} of 16.`

    const reply = await generateReply(systemPrompt, messages ?? [])
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Interview message error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
