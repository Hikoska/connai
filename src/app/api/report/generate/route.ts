import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY ?? '',
})

const DIMENSIONS = [
  'IT Infrastructure & Cloud',
  'Cybersecurity',
  'Data & Analytics',
  'Process Automation',
  'Digital Customer Experience',
  'Workforce & Digital Culture',
  'Innovation & Strategy',
  'Governance & Compliance',
] as const

async function dbGet(table: string, query: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`DB ${table} error: ${res.status}`)
  return res.json()
}

async function dbPost(table: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DB insert ${table} error: ${res.status} ${text}`)
  }
}

function isRateLimit(err: any): boolean {
  const msg = String(err?.message ?? err).toLowerCase()
  const status = err?.status ?? err?.cause?.status
  return status === 429 || msg.includes('rate limit') || msg.includes('429')
}

export async function POST(request: Request) {
  if (!SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { interview_token } = body
  if (!interview_token) {
    return NextResponse.json({ error: 'interview_token is required' }, { status: 400 })
  }

  // Fix: was using token=eq. (wrong column name), should be interview_token=eq.
  const interviews = await dbGet('interviews', `interview_token=eq.${interview_token}&limit=1`)
  if (!interviews.length) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }
  const interview = interviews[0]

  // Fetch transcript
  let messages: any[] = []
  try {
    messages = await dbGet(
      'chat_messages',
      `interview_id=eq.${interview.id}&order=created_at.asc`
    )
  } catch {
    try {
      messages = await dbGet(
        'chat_messages',
        `interview_token=eq.${interview_token}&order=created_at.asc`
      )
    } catch {
      messages = []
    }
  }

  if (!messages.length) {
    return NextResponse.json({ error: 'No transcript found for this interview' }, { status: 404 })
  }

  const transcript = messages
    .map((m: any) => `${m.role === 'user' ? 'Stakeholder' : 'Connai'}: ${m.content}`)
    .join('\n')

  // Score dimensions
  const dimensionPrompt = `You are a digital maturity expert. Analyze the following interview transcript and score each of the 8 dimensions from 0 to 100.

Dimensions:
${DIMENSIONS.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Transcript:
${transcript.slice(0, 8000)}

Respond ONLY with a valid JSON object mapping each dimension name to a score (integer 0-100). No explanation, no markdown.`

  let dimensionScores: Record<string, number> = {}

  const tryScore = async (model: any) => {
    const { text } = await generateText({
      model,
      prompt: dimensionPrompt,
      maxTokens: 400,
      temperature: 0.2,
    })
    return JSON.parse(text.trim())
  }

  try {
    dimensionScores = await tryScore(groq('llama-3.3-70b-versatile'))
  } catch (err) {
    if (isRateLimit(err) && process.env.CEREBRAS_API_KEY) {
      try {
        dimensionScores = await tryScore(cerebras('llama3.1-8b'))
      } catch {
        return NextResponse.json({ error: 'LLM scoring failed (rate limited)' }, { status: 429 })
      }
    } else {
      return NextResponse.json({ error: 'LLM scoring failed' }, { status: 500 })
    }
  }

  const overallScore = Math.round(
    Object.values(dimensionScores).reduce((a, b) => a + b, 0) / DIMENSIONS.length
  )

  // Save report
  await dbPost('reports', {
    lead_id: interview.lead_id,
    interview_id: interview.id,
    overall_score: overallScore,
    dimension_scores: dimensionScores,
    generated_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, overall_score: overallScore, dimensions: dimensionScores })
}
