import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

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
- Step 1: Ask for their organisation name and industry.
- Step 2: Ask for their role.
- Step 3: Ask: "What's the best email address to send your interview link to?"
- Step 4: Respond with exactly ONE warm confirmation sentence (e.g. "Perfect — your audit is being set up now, you'll receive your interview link at [email] shortly."). Then on the very next line, emit this tag EXACTLY with real values substituted — the user will not see it rendered:
<CONNAI_CAPTURE>{"org":"ORGNAME","industry":"INDUSTRY","role":"ROLE","email":"EMAIL"}</CONNAI_CAPTURE>
- Step 5: Immediately after Step 4, ask (1–2 sentences): "To give [org name] a complete picture, we typically gather input from 2–3 others in your team. Who are the key people involved in your digital operations? For example: IT lead, operations manager, finance director — just list their names and roles."
- Step 6: After the user lists stakeholders, emit this tag EXACTLY — the user will not see it rendered:
<CONNAI_STAKEHOLDERS>[{"name":"NAME1","role":"ROLE1"},{"name":"NAME2","role":"ROLE2"}]</CONNAI_STAKEHOLDERS>
  Then reply (max 2 sentences): "Perfect. I've noted [N] stakeholder[s] — their interview links will appear on your audit page automatically."

Critical style rules for ALL modes:
- Keep every response to 1–2 sentences (except Step 4 and Step 6 which follow their own format).
- Always end Steps 1–3 and Mode 1 responses with exactly one question.
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

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Try Groq first
  if (process.env.GROQ_API_KEY) {
    try {
      const result = await streamText({
        model: groq('llama-3.3-70b-versatile'),
        system: SYSTEM_PROMPT,
        messages,
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
