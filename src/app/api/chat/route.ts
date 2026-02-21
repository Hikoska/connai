import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

const SYSTEM_PROMPT = `You are Connai, an AI assistant helping organisations understand their digital maturity.`

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
