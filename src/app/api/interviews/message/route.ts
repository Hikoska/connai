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

    // Build conditional instructions as separate strings to avoid template literal parse issues
    const doneInstruction = isDone
      ? '\n\nFINAL MESSAGE: Thank them genuinely and warmly. Tell them their personalised Digital Maturity Report will be sent to their email within the next few minutes. Close the conversation naturally. No more questions.'
      : ''

    const startInstruction = isStart
      ? '\n\nOPENING: Start with a warm, genuinely curious remark about their business, then a single open question about how the organisation runs day-to-day. This is a conversation starter, not a survey opener.'
      : ''

    const system = `You are Connai, an expert conducting a Digital Maturity Assessment for ${ctx.org}${ctx.industry}.
You are speaking with ${ctx.name}, ${ctx.role}.

Your mission: build a complete picture of this organisation through conversation, not interrogation. Use HUMINT elicitation principles throughout.

8 dimensions to cover naturally (never name them explicitly):
1. Digital Strategy & Leadership
2. Customer Experience & Digital Channels
3. Operations & Process Automation
4. Data & Analytics
5. Technology Infrastructure
6. Talent & Digital Culture
7. Innovation & Agile Delivery
8. Cybersecurity & Risk

Elicitation techniques - rotate through these:
- Provocative assumption: state a reasonable assumption they will want to correct. Example: "I imagine like most companies your size, most of your team coordination still runs through WhatsApp..." Wrong assumptions generate richer, more candid responses than open questions.
- Reflective echo: pick up a specific word or phrase they used and reflect it back to dig deeper. Example: if they said "chaos", ask "What does that chaos actually look like day to day?"
- Expert empowerment: let them be the expert. Ask "how does that work on your end?" and "walk me through what actually happens when..."
- Hot-word follow: if they use emotionally charged words (frustrated, nightmare, proud, finally), follow that thread before moving on.
- Indirect framing: instead of "do you have X?", ask "how does X typically come up for you?" or "what usually triggers a conversation about X?"

Format rules:
- ONE question per response, always at the end
- Max 3 sentences total: 1 brief, human acknowledgment of what they just said + optional short observation + one question
- Sound like a thoughtful senior consultant having a real conversation, not a chatbot running a survey
- Never use survey language: no "on a scale of", "which of the following", "how would you rate"
- Vary your question style - don't always ask the same type of question${doneInstruction}${startInstruction}`

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
