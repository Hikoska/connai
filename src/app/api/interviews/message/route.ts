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
  return status === 429 || msg.includes('rate limit') || msg.toLowerCase().includes('429')
}

async function getInterviewContext(token: string) {
  const ivRes = await fetch(
    `${SB_URL}/rest/v1/interviews?token=eq.${token}&select=id,lead_id,stakeholder_name,stakeholder_role&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
  )
  if (!ivRes.ok) return null
  const ivRows = await ivRes.json()
  if (!Array.isArray(ivRows) || !ivRows.length) return null
  const iv = ivRows[0]
  if (!iv?.id || !iv?.lead_id) return null

  const leadRes = await fetch(
    `${SB_URL}/rest/v1/leads?id=eq.${iv.lead_id}&select=org_name,industry&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
  )
  const leadRows = leadRes.ok ? await leadRes.json() : []
  const lead = (Array.isArray(leadRows) ? leadRows[0] : null) ?? {}

  return {
    id: iv.id,
    lead_id: iv.lead_id,
    name: iv.stakeholder_name || 'there',
    role: iv.stakeholder_role || 'team member',
    org: lead.org_name || 'your organisation',
    industry: lead.industry ? ` in the ${lead.industry} sector` : '',
  }
}

export async function POST(req: NextRequest) {
  try {
    // --- NULL GUARD: parse body safely ---
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
    }

    const { token, messages } = body as Record<string, unknown>

    // --- NULL GUARD: token ---
    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json({ error: 'Missing or invalid token' }, { status: 400 })
    }

    // --- NULL GUARD: messages shape ---
    if (messages !== undefined && !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages must be an array' }, { status: 400 })
    }

    const rawMessages = (messages as Array<unknown> | undefined) ?? []

    // --- NULL GUARD: validate each message item ---
    const formatted: Array<{ role: 'user' | 'assistant'; content: string }> = []
    for (const m of rawMessages) {
      if (!m || typeof m !== 'object') continue
      const msg = m as Record<string, unknown>
      const role = msg.role
      const content = msg.content
      if (
        (role === 'user' || role === 'assistant') &&
        typeof content === 'string' &&
        content.trim().length > 0
      ) {
        formatted.push({ role, content: content.trim() })
      }
    }

    // --- NULL GUARD: interview context ---
    const ctx = await getInterviewContext(token.trim())
    if (!ctx) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    const count = formatted.length
    const isFirstMessage = count === 1
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

Your mission is to build a complete picture of this organisation through conversation. Use HUMINT elicitation principles to guide your questions and responses.

Let's explore how your organization approaches these key areas:
1. Digital strategy and leadership: How do you plan and guide your digital initiatives?
2. Customer experience: How do you design and deliver digital interactions?
3. Operations and processes: How do you streamline and automate your workflows?
4. Data and analytics: How do you collect, analyze, and use data to inform decisions?
5. Technology infrastructure: What systems and tools do you use to support your operations?
6. Talent and culture: How do you develop and support your team's digital skills?
7. Innovation & Agile Delivery: How do you approach innovation and agile delivery in your organisation?
8. Cybersecurity & Risk: How do you protect your organisation from digital threats and manage risk?

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

    // Tier 1: Groq 70B primary
    if (process.env.GROQ_API_KEY) {
      try {
        const { text } = await generateText({
          model: groq('llama-3.3-70b-versatile'),
          system,
          messages: formatted,
          maxTokens: 400,
        })
        // Fire-and-forget: set first_message_at + status='started' on first user reply
        if (isFirstMessage) {
          fetch(`${SB_URL}/rest/v1/interviews?token=eq.${token}&status=eq.opened`, {
            method: 'PATCH',
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ first_message_at: new Date().toISOString(), status: 'started' }),
          }).catch(() => { /* non-fatal */ })
        }
        return NextResponse.json({ message: text, done: isDone })
      } catch (err) {
        if (!isRateLimit(err)) throw err
        console.warn('Groq 70B rate limit — cascading to Cerebras 8B')
      }
    }

    // Tier 2: Cerebras 8B fallback
    if (process.env.CEREBRAS_API_KEY) {
      try {
        const { text } = await generateText({
          model: cerebras('llama3.1-8b'),
          system,
          messages: formatted,
          maxTokens: 400,
        })
        return NextResponse.json({ message: text, done: isDone })
      } catch (err) {
        if (!isRateLimit(err)) throw err
        console.warn('Cerebras rate limit — cascading to Groq 8B')
      }
    }

    // Tier 3: Groq 8B last resort
    if (process.env.GROQ_API_KEY) {
      const { text } = await generateText({
        model: groq('llama-3.1-8b-instant'),
        system,
        messages: formatted,
        maxTokens: 400,
      })
      return NextResponse.json({ message: text, done: isDone })
    }

    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  } catch (err) {
    console.error('Interview message error:', err)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
