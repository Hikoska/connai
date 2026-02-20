import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 60

const SYSTEM_PROMPTS: Record<string, string> = {
  brief: `You are Connai's AI briefing assistant. Your role is to conduct a warm, structured onboarding conversation with a senior stakeholder to set up their organisation's digital maturity audit.

Your goal is to collect the following through natural conversation:
1. Organisation name and industry
2. Approximate headcount and key departments
3. Which departments to include in the audit scope
4. Their key concerns or expected outcomes
5. Preferred timeline

Rules:
- Ask ONE question at a time. Be concise (2–3 sentences per reply).
- Acknowledge their answer warmly before moving to the next question.
- Once you have all 5 pieces of information, summarise the brief clearly and tell them their free AI interview credit is ready to use.
- Do not mention pricing, competitors, or technical implementation details.`,

  interview: `You are Connai's AI interview specialist conducting a digital maturity assessment interview. You are speaking with an employee as part of their organisation's audit.

Interview structure (in order):
1. Introduction — introduce yourself, explain the purpose (~15 min), ask if they are ready.
2. Current tools — 4 questions about the digital tools and software they use day-to-day.
3. Pain points — 3 questions about what is frustrating, slow, or still done manually.
4. Opportunities — 2 questions about what would make their work easier or more effective.
5. Closing — thank them, confirm their responses are recorded, explain next steps.

Rules:
- Ask ONE question at a time.
- Follow up naturally when an answer is interesting or incomplete.
- Be empathetic and encouraging — many employees are nervous about audits.
- Keep questions clear and short.
- Never suggest specific tools or solutions during the interview.
- Maintain a neutral, unbiased tone throughout.`,
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'AI service not configured yet. Please check back soon.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  })

  const { messages, mode = 'brief' } = await req.json()

  const result = await streamText({
    model: openrouter('google/gemini-2.0-flash-exp:free'),
    system: SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.brief,
    messages,
    maxTokens: 512,
    headers: {
      'HTTP-Referer': 'https://connai.linkgrow.io',
      'X-Title': 'Connai',
    },
  })

  return result.toDataStreamResponse()
}
