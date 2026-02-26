import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY ?? '',
})

function isRateLimit(error: unknown): boolean {
  if (!error) return false
  const e = error as Record<string, unknown>
  const msg = String(e?.message ?? error).toLowerCase()
  const status = (e?.status ?? (e?.cause as Record<string, unknown>)?.status) as number | undefined
  return status === 429 || msg.includes('rate limit') || msg.includes('429')
}

async function dbPost(table: string, body: Record<string, unknown>) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`DB insert failed: ${await res.text()}`)
  return res.json()
}

const DIMENSIONS = [
  'Strategy & Leadership',
  'Customer Experience',
  'Operations & Automation',
  'Data & Analytics',
  'Technology Infrastructure',
  'Culture & Change Management',
  'Innovation & Agility',
]

export async function POST(req: Request) {
  const { interview_id } = await req.json() as { interview_id: string }

  if (!interview_id) {
    return NextResponse.json({ error: 'interview_id is required' }, { status: 400 })
  }

  // Fetch interview + messages
  const ivRes = await fetch(
    `${SB_URL}/rest/v1/interviews?id=eq.${interview_id}&select=id,lead_id,stakeholder_name,stakeholder_role,status&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
  )
  const ivRows = await ivRes.json()
  if (!ivRows.length) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  const interview = ivRows[0]

  const msgsRes = await fetch(
    `${SB_URL}/rest/v1/interview_messages?interview_id=eq.${interview_id}&select=role,content&order=created_at.asc`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
  )
  const messages = await msgsRes.json()

  if (!messages.length) {
    return NextResponse.json({ error: 'No messages found for this interview' }, { status: 400 })
  }

  const transcript = messages
    .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const scoringPrompt = `You are a digital maturity assessment expert. Analyze this interview transcript and score the organization across ${DIMENSIONS.length} dimensions.\n\nInterview with: ${interview.stakeholder_name} (${interview.stakeholder_role})\n\nTranscript:\n${transcript}\n\nScore each dimension from 0-100 based on the evidence in the transcript. Return ONLY a JSON object:\n${JSON.stringify(Object.fromEntries(DIMENSIONS.map(d => [d, 0])), null, 2)}\n\nReturn only valid JSON, no explanation.`

  let dimensionScores: Record<string, number> = {}

  async function tryScore(model: ReturnType<typeof groq>) {
    const { text } = await generateText({ model, prompt: scoringPrompt, maxTokens: 512 })
    const clean = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
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

  // Save report
  const reportRows = await dbPost('reports', {
    lead_id: interview.lead_id,
    interview_id: interview.id,
    overall_score: overallScore,
    dimension_scores: dimensionScores,
    generated_at: new Date().toISOString(),
  })

  const reportId = reportRows[0]?.id ?? interview.lead_id

  // Send report-ready email to lead (non-fatal)
  try {
    const emailRes = await fetch(
      `${SB_URL}/rest/v1/leads?id=eq.${interview.lead_id}&select=email&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
    )
    const emailRows = await emailRes.json()
    const leadEmail = emailRows[0]?.email
    if (process.env.RESEND_API_KEY && leadEmail) {
      await resend.emails.send({
        from: 'Connai <reports@connai.linkgrow.io>',
        to: [leadEmail],
        subject: 'Your Digital Maturity Report is ready',
        html: `<p>Hi,</p><p>Your Digital Maturity Assessment is complete. Overall score: <strong>${overallScore}/100</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/report/${interview.lead_id}">View your report</a></p>`,
      })
    }
  } catch (emailErr) {
    console.warn('[report/generate] Email failed (non-fatal):', emailErr)
  }

  return NextResponse.json({
    ok: true,
    lead_id: interview.lead_id,
    report_id: reportId,
    overall_score: overallScore,
    dimensions: dimensionScores,
  })
}