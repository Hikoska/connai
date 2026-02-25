import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GROQ_KEY = process.env.GROQ_API_KEY
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://connai.linkgrow.io'

function isRateLimit(err: any): boolean {
  const msg = String(err?.message ?? '').toLowerCase()
  const s = err?.status ?? 0
  return s === 429 || msg.includes('rate limit') || msg.includes('429')
}

async function callLLM(apiKey: string, baseUrl: string, model: string, prompt: string) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 800,
    }),
  })
  if (res.status === 429) throw Object.assign(new Error('Rate limited'), { status: 429 })
  if (!res.ok) throw new Error(`LLM error ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content as string
}

async function supaGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`DB error: ${res.status}`)
  return res.json()
}

export async function GET(req: NextRequest, { params }: { params: { leadId: string } }) {
  const { leadId } = params

  // 1. Check for existing report
  let reports: any[]
  try {
    reports = await supaGet(
      `reports?lead_id=eq.${leadId}&order=generated_at.desc&limit=1`
    )
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  // 2. Self-heal: if no report yet, auto-generate it now
  if (!reports.length) {
    let interviews: any[]
    try {
      interviews = await supaGet(
        `interviews?lead_id=eq.${leadId}&status=eq.complete&select=id,token&limit=1`
      )
    } catch {
      return NextResponse.json({ error: 'No completed interviews' }, { status: 404 })
    }

    if (!interviews.length) {
      return NextResponse.json({ error: 'No completed interviews for this lead' }, { status: 404 })
    }

    const interviewToken = interviews[0].token
    if (!interviewToken) {
      return NextResponse.json({ error: 'Interview has no token' }, { status: 500 })
    }

    // Synchronous call to report/generate (await — NOT fire-and-forget)
    const genRes = await fetch(`${APP_URL}/api/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: interviewToken }),
    })

    if (!genRes.ok) {
      const err = await genRes.text().catch(() => genRes.statusText)
      return NextResponse.json({ error: `Report generation failed: ${err}` }, { status: 500 })
    }

    // Re-fetch reports after generation
    try {
      reports = await supaGet(
        `reports?lead_id=eq.${leadId}&order=generated_at.desc&limit=1`
      )
    } catch {
      return NextResponse.json({ error: 'Report generation timed out' }, { status: 503 })
    }

    if (!reports.length) {
      return NextResponse.json({ error: 'Report generation did not persist' }, { status: 503 })
    }
  }

  // 3. Generate action plan from dimension scores
  const report = reports[0]
  const scores: Record<string, number> = report.dimension_scores ?? {}
  const overall: number = report.overall_score ?? 0

  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => (a as number) - (b as number))
    .map(([dim, score]) => `${dim}: ${score}/100`)
    .join('\n')

  const prompt = `You are a digital transformation advisor. Given this organisation's digital maturity scores, generate a prioritised action plan.

Overall score: ${overall}/100

Dimension scores (weakest to strongest):
${sorted}

Generate a JSON action plan with exactly this structure — no explanation, no markdown, just valid JSON:
{
  "quick_wins": [
    { "action": "...", "dimension": "...", "impact": "High|Medium", "effort": "Low" }
  ],
  "six_month": [
    { "action": "...", "dimension": "...", "impact": "High|Medium", "effort": "Medium" }
  ],
  "long_term": [
    { "action": "...", "dimension": "...", "impact": "High", "effort": "High" }
  ],
  "summary": "One-sentence executive summary of the organisation's digital maturity position."
}

Rules: 2-3 items per tier. Actions must be specific and actionable (not generic). Reference actual dimension names from the scores.`

  let text: string | null = null

  if (GROQ_KEY) {
    try {
      text = await callLLM(GROQ_KEY, 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', prompt)
    } catch (err) {
      if (!isRateLimit(err)) return NextResponse.json({ error: 'LLM error' }, { status: 500 })
    }
  }

  if (!text && CEREBRAS_KEY) {
    try {
      text = await callLLM(CEREBRAS_KEY, 'https://api.cerebras.ai/v1', 'llama3.1-8b', prompt)
    } catch {
      return NextResponse.json({ error: 'LLM unavailable' }, { status: 429 })
    }
  }

  if (!text) return NextResponse.json({ error: 'No LLM configured' }, { status: 500 })

  let plan: any
  try {
    const clean = text.trim().replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim()
    plan = JSON.parse(clean)
  } catch {
    return NextResponse.json({ error: 'Invalid plan format from LLM', raw: text }, { status: 500 })
  }

  return NextResponse.json(plan)
}
