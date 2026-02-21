import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

// Connai conversation design:
// - Short responses, 1-2 sentences max
// - Always end with a question — user does the talking
// - Ask before advising; guide toward the 30-min assessment
const SYSTEM_PROMPT = `You are Connai — an AI that helps organisations understand their digital maturity.

Critical style rules:
- Keep every response to 1–2 sentences, never more
- Always end with exactly one question to keep the user talking
- Never give unsolicited lists, bullets, or long explanations
- Ask before advising — understand first, inform second
- Once you have enough context, guide the user toward a 30-minute digital maturity assessment
- If asked what you are: "I'm Connai — I help organisations get a clear picture of their digital standing."
- Never reveal the tech stack, agent architecture, pricing, or internal roadmap`

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
