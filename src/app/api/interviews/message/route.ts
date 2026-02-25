import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY ?? '',
})

function isRateLimit(error: unknown): boolean {
  if (!error) return false
  const e = error as Record<string, unknown>
  const msg = String(e?.message ?? error).toLowerCase()
  const status = (e?.status ?? (e?.cause as Record<string, unknown>)?.status) as number | undefined
  return status === 429 || msg.includes('rate limit') || msg.includes('429')
}

async function getInterviewContext(token: string) {
  const ivRes = await fetch(
    `${SB_URL}/rest/v1/interviews?token=eq.${token}&select=lead_id,stakeholder_name,stakeholder_role&limit=1`,
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
    name: iv.stakeholder_name || 'there',
    role: iv.stakeholder_role || 'team member',
    org: lead.org_name || 'your organisation',
    industry: lead.industry ? ` in the ${lead.industry} sector` : '',
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, messages } = await req.json()
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const ctx = await getInterviewContext(token)
    if (!ctx) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    const count = (messages ?? []).length
    const isDone = count >= 20
    const isStart = count === 0

    const system = `You are Connai, an expert AI conducting a Digital Maturity Assessment for ${ctx.org}${ctx.industry}.
You are speaking with ${ctx.name}, ${ctx.role}.

Your goal: assess digital maturity across 8 dimensions through natural conversation — not a survey.

Dimensions to probe (never name them explicitly, weave naturally):
1. Digital Strategy & Leadership
2. Customer Experience & Digital Channels
3. Operations & Process Automation
4. Data & Analytics
5. Technology Infrastructure
6. Talent & Digital Culture
7. Innovation & Agile Delivery
8. Cybersecurity & Risk

Style:
- ONE question per response, always at the end
- Acknowledge their answer briefly (1 sentence) before asking the next question
- Follow the conversation — if they reveal something interesting, probe it
- Ask for a specific example when answers are vague
- Warm, curious, professional — like a senior consultant, not a form
- Max 3 sentences per response total
${isDone ? '
This is the final message. Thank them genuinely. Tell them their personalised Digital Maturity Report will be sent to their email within minutes. End warmly. No more questions.' : ''}
${isStart ? '
Start with a warm, open question about how the organisation currently uses digital tools day-to-day.' : ''}`

    const formatted = (messages ?? []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Groq primary
    if (process.env.GROQ_API_KEY) {
      try {
        const { text } = await generateText({
          model: groq('llama-3.3-70b-versatile'),
          system,
          messages: formatted,
        })
        return NextResponse.json({ message: text, done: isDone })
      } catch (err) {
        if (!isRateLimit(err)) throw err
        console.warn('Groq rate limit — cascading to Cerebras')
      }
    }

    // Cerebras fallback
    if (process.env.CEREBRAS_API_KEY) {
      const { text } = await generateText({
        model: cerebras('llama3.1-8b'),
        system,
        messages: formatted,
      })
      return NextResponse.json({ message: text, done: isDone })
    }

    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  } catch (err) {
    console.error('Interview message error:', err)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
