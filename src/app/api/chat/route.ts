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
- Once in this mode, you follow a simple conversational flow to gather initial info.
- Step 1: Ask for their organisation name and industry.
- Step 2: Ask for their role.
- Step 3 (LATER): Hand off to a different tool for the full interview. For now, just say "Thank you. The next step would be the full interview, which is coming in a future version."

Critical style rules for ALL modes:
- Keep every response to 1–2 sentences.
- Always end with exactly one question.
`

// Groq: 300+ tokens/sec, llama-3.3-70b-versatile, 1K req/day free tier
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

const MODEL = groq('llama-3.3-70b-versatile')

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const result = await streamText({
      model: MODEL,
      system: SYSTEM_PROMPT,
      messages,
    })

    return result.toDataStreamResponse()
  } catch (error: any) {
    console.error('Chat error:', error)
    return Response.json({
      error: error?.message || String(error),
      cause: error?.cause?.message,
    }, { status: 500 })
  }
}
