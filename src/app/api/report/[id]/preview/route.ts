import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey:  process.env.GROQ_API_KEY,
})
const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey:  process.env.CEREBRAS_API_KEY ?? '',
})

const DIMENSIONS = [
  'Digital Strategy & Leadership',
  'Customer Experience & Digital Channels',
  'Operations & Process Automation',
  'Data & Analytics',
  'Technology Infrastructure',
  'Talent & Digital Culture',
  'Innovation & Agile Delivery',
  'Cybersecurity & Risk',
]

async function sbGet(path: string, useService = false) {
  const key = useService ? SB_SVC : SB_ANON
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

async function scoreTranscript(transcript: string): Promise<Record<string, number>> {
  const prompt = `You are scoring a Digital Maturity Assessment. Score this organisation across 8 dimensions (0-100 each).

0-20: Initial/ad-hoc | 21-40: Emerging | 41-60: Defined | 61-80: Advanced | 81-100: Leading

Return ONLY valid JSON, no commentary:
{
"Digital Strategy & Leadership":<n>,
"Customer Experience & Digital Channels":<n>,
"Operations & Process Automation":<n>,
"Data & Analytics":<n>,
"Technology Infrastructure":<n>,
"Talent & Digital Culture":<n>,
"Innovation & Agile Delivery":<n>,
"Cybersecurity & Risk":<n>
}

Transcript:
${transcript.slice(0, 6000)}`

  const tryAI = async (model: ReturnType<typeof groq>) => {
    const { text } = await generateText({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.1 })
    return text
  }

  let raw = ''
  try { raw = await tryAI(groq('llama-3.3-70b-versatile')) }
  catch { try { raw = await tryAI(cerebras('hama3.1-8b')) } catch { /* fallback below */ } }

  const match = raw.match(/\{7[\s\S]*\}/)
  if (!match) return Object.fromEntries(DIMENSIONS.map(d => [d, 35]))
  try { return JSON.parse(match[0]) } catch { return Object.fromEntries(DIMENSIONS.map(d => [d, 35])) }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Guard: SUPABASE_SERVICE_ROLE_KEY is required to fetch interview answers
  if (!SB_SVC) {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.' },
      { status: 500 }
    )
  }

  // 1. Fetch all interviews for this lead
  const interviews = await sbGet(`/interviews?lead_id=eq.${id}&select=id,status,created_at&order=created_at.desc`)
  if (!Array.isArray(interviews) || interviews.length === 0) {
    return NextResponse.json({ error: 'No interviews found' }, { status: 404 })
  }

  const totalCount = interviews.length
  const completed = interviews.filter((iv: { status: string }) => iv.status === 'completed')
  const completedCount = completed.length
  const partial = completedCount < totalCount || completedCount === 0

  // If nothing completed yet, return placeholder
  if (completedCount === 0) {
    return NextResponse.json({
      leadId: id, completedCount: 0, totalCount,
      dimensions: DIMENSIONS.map(name => ({ name, score: 0 })),
      partial: true,
    })
  }

  // 2. Check for cached scores on the lead
  const leadRows = await sbGet(`/leads?id=eq.${id}&select=dimension_scores,overall_score&limit=1`)
  const cached = Array.isArray(leadRows) ? leadRows[0] : null
  if (cached?.dimension_scores && typeof cached.dimension_scores === 'object') {
    return NextResponse.json({
      leadId: id, completedCount, totalCount, partial,
      dimensions: DIMENSIONS.map(name => ({ name, score: (cached.dimension_scores as Record<string, number>)[name] ?? 35 })),
    })
  }

  // 3. Fetch transcript from most recent completed interview
  const latestId = completed[0].id
  const ivRows = await sbGet(`/interviews?id=eq.${latestId}&select=answers&limit=1`, true)
  const ivData  = Array.isArray(ivRows) ? ivRows[0] : null

  let transcript = ''
  if (Array.isArray(ivData?.answers)) {
    transcript = (ivData.answers as Array<{ role: string; content: string }>)
      .map(m => `${m.role === 'user' ? 'Stakeholder' : 'Interviewer'}: ${m.content}`)
      .join('\n\n')
  }

  if (!transcript) {
    return NextResponse.json({
      leadId: id, completedCount, totalCount, partial,
      dimensions: DIMENSIONS.map(name => ({ name, score: 42 })),
    })
  }

  // 4. Score with AI
  const raw = await scoreTranscript(transcript)
  const dimensions = DIMENSIONS.map(name => ({
    name,
    score: Math.min(100, Math.max(0, Math.round((raw[name] as number) ?? 35))),
  }))
  const overallScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length)

  // 5. Cache to leads (best-effort -- columns may not exist yet)
  fetch(`${SB_URL}/rest/v1/leads?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ dimension_scores: raw, overall_score: overallScore }),
  }).catch(() => {})

  return NextResponse.json({ leadId: id, completedCount, totalCount, dimensions, partial })
}
