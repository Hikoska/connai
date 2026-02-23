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

  // ── Fetch interview ──────────────────────────────────────────────────────
  const interviews = await dbGet('interviews', `token=eq.${interview_token}&limit=1`)
  if (!interviews.length) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }
  const interview = interviews[0]

  // ── Fetch transcript ─────────────────────────────────────────────────────
  let messages: any[] = []
  try {
    messages = await dbGet(
      'chat_messages',
      `interview_id=eq.${interview.id}&order=created_at.asc`
    )
  } catch {
    // Fallback: some schemas use token instead of interview_id
    try {
      messages = await dbGet(
        'chat_messages',
        `interview_token=eq.${interview_token}&order=created_at.asc`
      )
    } catch {
      messages = []
    }
  }

  const transcript =
    messages.length > 0
      ? messages.map((m: any) => `${(m.role || 'unknown').toUpperCase()}: ${m.content}`).join('\n')
      : 'No transcript — generate a baseline assessment from company profile only.'

  // ── Build synthesis prompt ───────────────────────────────────────────────
  const prompt = `You are a senior digital transformation analyst synthesising an interview transcript into a structured maturity report.

Context:
- Organisation: ${interview.organisation || 'Unknown'}
- Industry: ${interview.industry || 'Unknown'}
- Country: ${interview.country || 'MU'}
- Respondent: ${interview.stakeholder_email}

Transcript:
${transcript}

Return a JSON object with EXACTLY this structure (no markdown, no prose outside JSON):
{
  "organisation": "<string>",
  "industry": "<string>",
  "overall_score": <number 1.0–5.0 one decimal>,
  "overall_label": "<Emerging|Developing|Established|Advanced|Leading>",
  "executive_summary": "<2-3 sentences, concrete and direct>",
  "dimensions": [
    {
      "name": "<one of: ${DIMENSIONS.join(', ')}>",
      "score": <number 1.0–5.0 one decimal>,
      "label": "<maturity label>",
      "finding": "<1 sentence stating current state>",
      "top_priority": "<1 concrete next action with measurable outcome>"
    }
  ],
  "quick_wins": ["<action>", "<action>", "<action>"],
  "strategic_priorities": ["<6-12 month priority>", "<priority>", "<priority>"],
  "consulting_hook": "<1-2 sentences connecting findings to a Connai/Linkgrow advisory engagement>"
}

All 8 dimensions MUST be present. Base scores on evidence in transcript; use industry benchmarks when transcript is sparse.`

  // ── LLM cascade: Groq → Cerebras ─────────────────────────────────────────
  let reportContent: any = null

  if (process.env.GROQ_API_KEY) {
    try {
      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt,
        maxTokens: 2500,
      })
      reportContent = JSON.parse(text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    } catch (err) {
      if (!isRateLimit(err)) throw err
      console.warn('Groq rate-limited — falling back to Cerebras')
    }
  }

  if (!reportContent && process.env.CEREBRAS_API_KEY) {
    const { text } = await generateText({
      model: cerebras('llama3.1-8b'),
      prompt,
      maxTokens: 2500,
    })
    reportContent = JSON.parse(text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''))
  }

  if (!reportContent) {
    return NextResponse.json(
      { error: 'Report generation failed — all LLM providers unavailable' },
      { status: 503 }
    )
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  try {
    await dbPost('reports', {
      interview_id: interview.id,
      content: reportContent,
      status: 'complete',
      generated_at: new Date().toISOString(),
    })
  } catch (saveErr) {
    // Don't block the response — content is what matters
    console.error('Report save failed:', saveErr)
  }

  return NextResponse.json({ report: reportContent })
}
