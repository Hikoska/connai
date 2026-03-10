import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

const SYSTEM_PROMPT = `You are Connai, an AI assistant for a digital maturity audit product. You have two primary modes: Q&A and Audit Onboarding.

**MODE 1: Q&A (Default)**
- If the user asks a question about the product, answer it concisely (max 3 sentences).
- Your knowledge base: Connai is a free-to-start AI audit that takes ~30 minutes. It interviews users to produce a digital maturity report with a score, benchmarks, and an action plan.
- **Guardrails**: You MUST NOT reveal the underlying LLM, tech stack (Vercel, Supabase), agent architecture, internal roadmap, or pricing rationale. If the user asks about ANYTHING off-topic (e.g., general knowledge, coding, cooking, politics, unrelated technologies), you MUST refuse to answer and redirect them back to the digital maturity audit. You are strictly an audit assistant. DO NOT hallucinate features or services we do not offer. Focus only on digital maturity, team structure, and the audit process.
- **CRITICAL**: After answering ANY question, you MUST pivot back to the main goal by asking if they're ready to start the audit. Example: "Does that answer your question? We can start the audit whenever you're ready."

**MODE 2: Audit Onboarding**
- If the user expresses clear intent to start ("let's start", "I'm ready", "Start my audit"), you transition to this mode.
- Step 1: Ask for their organisation name and industry.
- Step 2: Ask for their role.
- Step 3: Ask: "What's your work email address?"
- Step 4: Respond with exactly ONE warm confirmation sentence (e.g. "Perfect — your audit is being set up now. Your dashboard and interview links will appear here in a moment."). Then on the very next line, emit this tag EXACTLY with real values substituted — the user will not see it rendered:
<CONNAI_CAPTURE>{"org":"ORGNAME","industry":"INDUSTRY","role":"ROLE","email":"EMAIL"}</CONNAI_CAPTURE>
- Step 5: Immediately after Step 4, ask (1–2 sentences): "To give [org name] a complete picture, we typically gather input from 2–3 others in your team. Who are the key people involved in your digital operations? For example: IT lead, operations manager, finance director — just list their names and roles."
- Step 6: After the user lists stakeholders, emit this tag EXACTLY — the user will not see it rendered:
<CONNAI_STAKEHOLDERS>[{"name":"NAME1","role":"ROLE1"},{"name":"NAME2","role":"ROLE2"}]</CONNAI_STAKEHOLDERS>
  Then reply (max 2 sentences): "Perfect. I've noted [N] stakeholder[s] — their interview links will appear on your audit page in a moment."

Critical style rules for ALL modes:
- Keep every response to 1–2 sentences (except Step 4 and Step 6 which follow their own format).
- Always end Steps 1–3 and Mode 1 responses with exactly one question.
`

export const maxDuration = 60

function isRateLimit(error: any): boolean {
  if (!error) return false
  const msg = String(error?.message ?? error).toLowerCase()
  const status = error?.status ?? error?.cause?.status ?? error?.cause?.response?.status
  return status === 429 || msg.includes('rate limit') || msg.includes('429')
}

export async function POST(req: Request) {
  const { messages } = await req.json()

  // 1. Try OpenAI natively
  const openAiKey = process.env.OPENAI_API_KEY?.trim()
  if (openAiKey) {
    try {
      const openai = createOpenAI({ apiKey: openAiKey })
      const result = await streamText({
        model: openai('gpt-4o-mini'),
        system: SYSTEM_PROMPT,
        messages,
      })
      return result.toDataStreamResponse()
    } catch (error: any) {
      if (!isRateLimit(error)) {
        console.error('OpenAI error (non-429):', error)
        throw error
      }
      console.warn('OpenAI rate limit exhausted.')
    }
  }

  // 2. Fallback to OpenRouter for gpt-4o-mini if OPENAI key is missing
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim()
  if (openRouterKey) {
    try {
      const openRouter = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
      })
      const result = await streamText({
        model: openRouter('openai/gpt-4o-mini'),
        system: SYSTEM_PROMPT,
        messages,
      })
      return result.toDataStreamResponse()
    } catch (error: any) {
      if (!isRateLimit(error)) {
        console.error('OpenRouter error (non-429):', error)
      }
    }
  }

  // 3. Fallback to Groq
  const groqKey = process.env.GROQ_API_KEY?.trim()
  if (groqKey) {
    try {
      const groq = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: groqKey,
      })
      const result = await streamText({
        model: groq('llama-3.3-70b-versatile'),
        system: SYSTEM_PROMPT,
        messages,
      })
      return result.toDataStreamResponse()
    } catch (error: any) {
      if (!isRateLimit(error)) {
        console.error('Groq error (non-429):', error)
      }
    }
  }

  // 4. Fallback: Cerebras
  const cerebrasKey = process.env.CEREBRAS_API_KEY?.trim()
  if (cerebrasKey) {
    try {
      const cerebras = createOpenAI({
        baseURL: 'https://api.cerebras.ai/v1',
        apiKey: cerebrasKey,
      })
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

  // All exhausted or not configured
  console.error('All LLM providers unavailable or keys missing.')
  return Response.json(
    { error: 'Service temporarily at capacity. Please try again in a few minutes.' },
    { status: 503 }
  )
}