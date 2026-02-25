import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY ?? '',
})

const QUESTIONS = [
  "How would you describe your organisation's current use of digital tools day-to-day?",
  'Which business process do you think is most overdue for a digital upgrade?',
  'Where do you feel the biggest friction or bottleneck in your current workflows?',
  'How confident are you that your team could adopt a new digital tool within 30 days?',
  'If you could change one thing about how your organisation uses technology, what would it be?',
]

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
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`DB ${table} error: ${res.status} ${await res.text()}`)
  return res.json()
}

async function dbPost(table: string, body: object): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DB insert ${table} error: ${res.status} ${text}`)
  }
  return res.json()
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

  // Accept 'token' (current column name). Legacy 'interview_token' also accepted.
  const interviewToken = body.token ?? body.interview_token
  if (!interviewToken) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  // Fetch interview by token column
  const interviews = await dbGet(
    'interviews',
    `token=eq.${interviewToken}&select=id,lead_id,transcript,stakeholder_name,stakeholder_role,status&limit=1`
  )
  if (!interviews.length) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }
  const interview = interviews[0]

  if (interview.status !== 'complete') {
    return NextResponse.json({ error: 'Interview not yet complete' }, { status: 409 })
  }

  // Build transcript from interviews.transcript (JSONB string[])
  const answers: string[] = Array.isArray(interview.transcript) ? interview.transcript : []
  if (!answers.length) {
    return NextResponse.json({ error: 'No transcript found for this interview' }, { status: 404 })
  }

  const transcriptText = QUESTIONS
    .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] ?? '(no answer)'}`) 
    .join('\n\n')

  // Score dimensions
  const dimensionPrompt = `You are a digital maturity expert. Analyze the following stakeholder interview and score each of the 8 digital maturity dimensions from 0 to 100.

Dimensions:
${DIMENSIONS.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Interview with ${interview.stakeholder_name ?? 'stakeholder'} (${interview.stakeholder_role ?? 'unknown role'}):
${transcriptText}

Respond ONLY with a valid JSON object mapping each dimension name exactly as listed above to an integer score 0-100. No explanation, no markdown, no code block.`

  let dimensionScores: Record<string, number> = {}

  const tryScore = async (model: any) => {
    const { text } = await generateText({
      model,
      prompt: dimensionPrompt,
      maxTokens: 400,
      temperature: 0.2,
    })
    const clean = text.trim().replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim()
    return JSON.parse(clean)
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
      return NextResponse.json({ error: `LLM scoring failed: ${String(err)}` }, { status: 500 })
    }
  }

  const overallScore = Math.round(
    Object.values(dimensionScores).reduce((a: number, b: number) => a + (b as number), 0) / DIMENSIONS.length
  )

  // Save report — return=representation to get the inserted row ID
  const reportRows = await dbPost('reports', {
    lead_id: interview.lead_id,
    interview_id: interview.id,
    overall_score: overallScore,
    dimension_scores: dimensionScores,
    generated_at: new Date().toISOString(),
  })

  const reportId = reportRows[0]?.id ?? interview.lead_id

  return NextResponse.json({
    ok: true,
    lead_id: interview.lead_id,
    report_id: reportId,
    overall_score: overallScore,
    dimensions: dimensionScores,
  })
}
