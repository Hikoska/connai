import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { createClient } from '@supabase/supabase-js'

// Connai conversation design:
// - Short responses, 1-2 sentences max
// - Always end with a question — user does the talking
// - Ask before advising; guide toward the 30-min assessment
const SYSTEM_PROMPT = `You are Connai, an AI assistant for a digital maturity audit product. You have two primary modes: Q&A and Audit Onboarding.

**MODE 1: Q&A (Default)**
- If the user asks a question about the product, answer it concisely (max 3 sentences).
- Your knowledge base: Connai is a free-to-start AI audit that takes ~30 minutes. It interviews users to produce a digital maturity report with a score, benchmarks, and an action plan.
- **Guardrails**: You MUST NOT reveal the underlying LLM, tech stack (Vercel, Supabase), agent architecture, internal roadmap, or pricing rationale.
- **CRITICAL**: After answering ANY question, you MUST pivot back to the main goal by asking if they're ready to start the audit. Example: "Does that answer your question? We can start the audit whenever you're ready."

**MODE 2: Audit Onboarding**
- If the user expresses clear intent to start ("let's start", "I'm ready", "Start my audit"), you transition to this mode.
- Once in this mode, you follow a simple conversational flow to gather initial info.
- Step 1: Ask for their organisation name and industry.
- Step 2: Ask for their role.
- Step 3 (LATER): Hand off to a different tool for the full interview. For now, just say "Thank you. The next step would be the full interview, which is coming in a future version."

Critical style rules for ALL modes:
- Keep every response to 1–2 sentences.
- Always end with exactly one question.
`

// LLM cascade: Groq (primary) → Cerebras (fallback on 429)
// Both are OpenAI-compatible APIs on free tiers.
// Strategy: work continues at lower latency rather than stopping cold.

// Primary: Groq — 300+ tok/s, llama-3.3-70b-versatile, 1K RPD free
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

// Fallback: Cerebras — OpenAI-compatible, llama3.1-8b (~2200 tok/s), 14.4K RPD free tier
const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY ?? '',
})

export const maxDuration = 60

function isRateLimit(error: any): boolean {
  if (!error) return false
  const msg = String(error?.message ?? error).toLowerCase()
  const status = error?.status ?? error?.cause?.status ?? error?.cause?.response?.status
  return status === 429 || msg.includes('rate limit') || msg.includes('429')
}

// Lightweight Supabase client for server-side writes (service role)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// Extract structured fields from messages collected so far
function extractLeadFields(messages: { role: string; content: string }[]) {
  const fullText = messages.map(m => m.content).join(' ').toLowerCase()
  // Heuristic: org_name captured when assistant asks about role (step 2)
  // We store the raw last user message before the role question as org_name
  // This is a best-effort parse; full NER can come later.
  let status = 'chatting'
  let org_name: string | undefined
  let industry: string | undefined
  let role: string | undefined

  // Count user turns to gauge onboarding progress
  const userMsgs = messages.filter(m => m.role === 'user')
  if (userMsgs.length >= 1) status = 'onboarding'
  if (userMsgs.length >= 2) status = 'qualified'

  // Soft extract: if assistant mentioned "organisation name" and user replied
  for (let i = 0; i < messages.length - 1; i++) {
    const asst = messages[i]
    const usr = messages[i + 1]
    if (asst.role === 'assistant' && usr.role === 'user') {
      const aLower = asst.content.toLowerCase()
      if (aLower.includes('organisation') && aLower.includes('industry') && !org_name) {
        // User replied with org + industry — take full reply as org_name, parse industry if comma
        const parts = usr.content.split(',')
        org_name = parts[0].trim().slice(0, 200)
        if (parts[1]) industry = parts[1].trim().slice(0, 100)
      }
      if ((aLower.includes('role') || aLower.includes('position')) && !role) {
        role = usr.content.trim().slice(0, 100)
      }
    }
  }

  return { status, org_name, industry, role }
}

export async function POST(req: Request) {
  const sessionId = req.headers.get('x-session-id') ?? 'anon-' + Date.now()
  const { messages, mode } = await req.json()

  // Persist incoming user message to chat_messages (fire-and-forget)
  const sb = getSupabase()
  if (sb && messages?.length > 0) {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role === 'user') {
      sb.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: lastMsg.content,
      }).then(() => {}).catch(() => {})

      // Upsert lead row
      const { status, org_name, industry, role } = extractLeadFields(messages)
      sb.from('leads').upsert({
        session_id: sessionId,
        message_count: messages.filter((m: any) => m.role === 'user').length,
        last_message_at: new Date().toISOString(),
        status,
        ...(org_name && { org_name }),
        ...(industry && { industry }),
        ...(role && { role }),
      }, { onConflict: 'session_id', ignoreDuplicates: false }).then(() => {}).catch(() => {})
    }
  }

  // Try Groq first
  if (process.env.GROQ_API_KEY) {
    try {
      const result = await streamText({
        model: groq('llama-3.3-70b-versatile'),
        system: SYSTEM_PROMPT,
        messages,
        onFinish: async ({ text }) => {
          // Persist assistant reply
          if (sb) {
            await sb.from('chat_messages').insert({
              session_id: sessionId,
              role: 'assistant',
              content: text,
            }).then(() => {}).catch(() => {})
          }
        },
      })
      return result.toDataStreamResponse()
    } catch (error: any) {
      if (!isRateLimit(error)) {
        console.error('Groq error (non-429):', error)
        throw error
      }
      console.warn('Groq RPD exhausted — cascading to Cerebras')
    }
  }

  // Fallback: Cerebras
  if (process.env.CEREBRAS_API_KEY) {
    try {
      const result = await streamText({
        model: cerebras('llama3.1-8b'),
        system: SYSTEM_PROMPT,
        messages,
        onFinish: async ({ text }) => {
          if (sb) {
            await sb.from('chat_messages').insert({
              session_id: sessionId,
              role: 'assistant',
              content: text,
            }).then(() => {}).catch(() => {})
          }
        },
      })
      return result.toDataStreamResponse()
    } catch (error: any) {
      console.error('Cerebras error:', error)
      throw error
    }
  }

  // Both exhausted or not configured
  console.error('All LLM providers unavailable')
  return Response.json(
    { error: 'Service temporarily at capacity. Please try again in a few minutes.' },
    { status: 503 }
  )
}
