import { createOpenAI } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import { z } from 'zod'

const SYSTEM_PROMPT = `You are Connai.`

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const MODEL = openrouter('mistralai/mistral-small-3.1-24b-instruct:free')

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
      stack: error?.stack?.split('\n').slice(0, 5)
    }, { status: 500 })
  }
}
