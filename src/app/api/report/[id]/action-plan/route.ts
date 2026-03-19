import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY })
const cerebras = createOpenAI({ baseURL: 'https://api.cerebras.ai/v1', apiKey: process.env.CEREBRAS_API_KEY ?? '' })

async function sbGet(path: string, useService = false) {
  const key = useService ? SB_SVC : SB_ANON
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

async function generateWithFallback(prompt: string, maxTokens = 1500): Promise<string> {
  const models = [
    { p: groq,     m: 'qwen-qwq-32b' },
    { p: groq,     m: 'llama-3.3-70b-versatile' },
    { p: cerebras, m: 'llama3.1-8b' },
    { p: groq,     m: 'llama-3.1-8b-instant' },
  ]
  for (const { p, m } of models) {
    try {
      const { text } = await generateText({ model: p(m), prompt, temperature: 0.3, maxTokens })
      if (text && text.trim().length > 50) return text.trim()
    } catch { continue }
  }
  throw new Error('All AI providers failed')
}

/**
 * Flatten action-plan items to plain strings for the report page renderer.
 * The AI returns objects: { action, dimension, impact, effort }
 * We flatten to: "<action>" — or add context if available.
 */
function flattenItems(items: unknown[]): string[] {
  if (!Array.isArray(items)) return []
  return items.map(item => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>
      const action = String(o.action || '').trim()
      const dim    = o.dimension ? String(o.dimension) : ''
      const impact = o.impact    ? String(o.impact) : ''
      if (!action) return ''
      // Format: "<action> (dimension, High impact)"
      const ctx = [dim, impact ? `${impact} impact` : ''].filter(Boolean).join(' · ')
      return ctx ? `${action} (${ctx})` : action
    }
    return ''
  }).filter(Boolean)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(ip, 'action-plan', 5)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await params

  const leadRows = await sbGet(`/leads?id=eq.${id}&select=org_name,industry&limit=1`)
  const lead = Array.isArray(leadRows) ? leadRows[0] : null
  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })

  const repRows = await sbGet(`/reports?lead_id=eq.${id}&select=overall_score,dimension_scores&order=created_at.desc&limit=1`, true)
  const rep = Array.isArray(repRows) ? repRows[0] : null
  if (!rep?.dimension_scores) return NextResponse.json({ error: 'Scores not yet generated.' }, { status: 404 })

  const scores = rep.dimension_scores as Record<string, number>
  const orgName = lead.org_name ?? 'the organisation'
  const industry = lead.industry ?? 'their sector'
  const sortedDims = Object.entries(scores).sort(([, a], [, b]) => (a as number) - (b as number))
  const weakest = sortedDims.slice(0, 3).map(([n, s]) => `${n} (${s}/100)`).join(', ')
  const strongest = [...sortedDims].reverse().slice(0, 2).map(([n, s]) => `${n} (${s}/100)`).join(', ')
  const dimensionList = sortedDims.map(([n, s]) => `  ${n}: ${s}/100`).join('\n')

  const prompt = `You are a senior digital transformation consultant building a prioritised action plan for ${orgName} in ${industry}.

Overall score: ${rep.overall_score ?? '?'}/100
Dimension scores (lowest = highest priority):
${dimensionList}

Top 3 gaps: ${weakest}
Strongest areas: ${strongest}

Return ONLY valid JSON, no markdown fences, no explanation:
{"quick_wins":[{"action":"<30-day specific action>","dimension":"<name>","impact":"High|Medium|Low","effort":"Low|Medium|High"},{"action":"...","dimension":"...","impact":"...","effort":"..."},{"action":"...","dimension":"...","impact":"...","effort":"..."}],"six_month":[{"action":"<6-month initiative>","dimension":"<name>","impact":"High|Medium|Low","effort":"Low|Medium|High"},{"action":"...","dimension":"...","impact":"...","effort":"..."},{"action":"...","dimension":"...","impact":"...","effort":"..."}],"long_term":[{"action":"<12-24 month strategic programme>","dimension":"<name>","impact":"High|Medium|Low","effort":"Low|Medium|High"},{"action":"...","dimension":"...","impact":"...","effort":"..."},{"action":"...","dimension":"...","impact":"...","effort":"..."}],"summary":"<2 sentences: most important insight and what success looks like in 12 months>"}`

  let raw: string
  try { raw = await generateWithFallback(prompt, 1500) }
  catch { return NextResponse.json({ error: 'AI unavailable' }, { status: 503 }) }

  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    // Return flattened strings so the report page renderer works correctly
    return NextResponse.json({
      quick_wins: flattenItems(parsed.quick_wins ?? []),
      six_month:  flattenItems(parsed.six_month  ?? []),
      long_term:  flattenItems(parsed.long_term  ?? []),
      summary:    parsed.summary ?? '',
    })
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        return NextResponse.json({
          quick_wins: flattenItems(parsed.quick_wins ?? []),
          six_month:  flattenItems(parsed.six_month  ?? []),
          long_term:  flattenItems(parsed.long_term  ?? []),
          summary:    parsed.summary ?? '',
        })
      } catch { /* fall through */ }
    }
    return NextResponse.json({ error: 'Failed to parse action plan' }, { status: 500 })
  }
}
