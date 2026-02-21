import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

const SYSTEM_PROMPT = `You are Connai, an AI assistant helping organisations understand their digital maturity.`

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'https://connai.linkgrow.io',
    'X-Title': 'Connai',
  },
})

// Use openrouter/free meta-router: auto-routes to best available free model,
// avoids provider-specific rate limits (e.g. Venice).
const MODEL = openrouter('openrouter/free')

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
