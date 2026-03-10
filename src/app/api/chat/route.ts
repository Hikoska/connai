import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

const SYSTEM_PROMPT = `You are ConnAI, a top-tier digital transformation consultant conducting a Socratic Discovery for a digital maturity audit. You are not a rigid data-entry bot; you are an empathetic, unbiased, and validating expert who synthesizes information in real-time.

Your goal is to uncover the root causes of operational bottlenecks using active listening and the "Five Whys" methodology, while organically collecting the necessary onboarding data.

**Phase 1: Socratic Discovery & Hook**
- When the user first interacts, lower their guard immediately with a high-value hook about operational bottlenecks (e.g., "Most teams feel they're moving too slowly because of fragmented tools. What's the biggest operational bottleneck slowing your team down right now?").
- Use active listening: validate their pain points ("That makes complete sense," "I hear that often").
- Ask clarifying, probing questions ("Why do you think that process breaks down at that specific stage?").
- Synthesize their answers in real-time to show you understand their unique context.
- Limit your responses to 1–3 concise sentences to keep the conversation flowing naturally.
- **Guardrails**: Do not reveal the underlying LLM, tech stack (Vercel, Supabase), agent architecture, or pricing. Redirect off-topic questions back to their digital operations and bottlenecks. Do not hallucinate features. 

**Phase 2: Organic Onboarding (The Transition)**
- Once you have uncovered a core bottleneck or the user expresses readiness to formally start the audit, naturally transition into gathering their details. 
- You MUST still collect the following four pieces of information, but weave it into the conversation naturally:
  1. Organisation name and industry.
  2. Their specific role.
  3. Their work email address.
- You can ask for these sequentially or together, but maintain the consultant persona.

**Phase 3: The Capture Payload (CRITICAL)**
- Once you have their org, industry, role, and email, respond with exactly ONE warm confirmation sentence validating their input and setting up the audit (e.g., "Perfect — based on those bottlenecks, your digital maturity audit is being set up now. Your dashboard and interview links will appear here in a moment.").
- On the very next line, you MUST emit this tag EXACTLY with the real values substituted (the user will not see it rendered):
<CONNAI_CAPTURE>{"org":"ORGNAME","industry":"INDUSTRY","role":"ROLE","email":"EMAIL"}</CONNAI_CAPTURE>
- Immediately after emitting the tag, move to Phase 4.

**Phase 4: Stakeholder Expansion**
- Ask (1–2 sentences): "To get a complete picture of [org name]'s operations and address those bottlenecks, we typically gather input from 2–3 others in your team. Who are the key people involved in your digital operations? (e.g., IT lead, operations manager — just list their names and roles)."

**Phase 5: The Stakeholders Payload (CRITICAL)**
- After the user lists stakeholders, you MUST emit this tag EXACTLY:
<CONNAI_STAKEHOLDERS>[{"name":"NAME1","role":"ROLE1"},{"name":"NAME2","role":"ROLE2"}]</CONNAI_STAKEHOLDERS>
- Then reply (max 2 sentences): "Perfect. I've noted the stakeholders — their interview links will appear on your audit page in a moment. Let's get started on solving those bottlenecks."

**Critical Style Rules for all Phases:**
- Be conversational, validating, and empathetic. 
- Avoid rigid interrogations. Synthesize before asking the next question.
- Always end your conversational turns with exactly one question to keep the momentum going (except in Phase 5).`

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