import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

const cerebras = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY,
})

type DimensionScores = Record<string, number>

interface InterviewRow {
  id: string
  lead_id: string
  messages: Array<{ role: string; content: string }>
  stakeholder_role?: string
  leads: { org_name: string; industry?: string; role?: string } | null
}

async function generateWithFallback(prompt: string): Promise<string> {
  const models = [
    { client: groq, model: 'qwen-qwq-32b' },
    { client: groq, model: 'llama-3.3-70b-versatile' },
    { client: cerebras, model: 'llama-3.3-70b' },
  ]
  for (const { client, model } of models) {
    try {
      const { text } = await generateText({ model: client(model), prompt, maxTokens: 2000 })
      if (text && text.length > 50) return text
    } catch {
      continue
    }
  }
  throw new Error('All AI providers failed')
}

function scoreDimension(messages: Array<{ role: string; content: string }>, keyword: string): number {
  const relevant = messages.filter(m => m.content.toLowerCase().includes(keyword.toLowerCase()))
  if (relevant.length === 0) return Math.floor(Math.random() * 30) + 30
  const positiveSignals = relevant.filter(m =>
    /good|strong|well|yes|have|using|implemented|advanced|mature/i.test(m.content)
  ).length
  const negativeSignals = relevant.filter(m =>
    /no|not|don't|haven't|basic|limited|poor|weak|struggle/i.test(m.content)
  ).length
  const base = 50
  const score = base + (positiveSignals * 10) - (negativeSignals * 10) + Math.floor(Math.random() * 20) - 10
  return Math.max(10, Math.min(95, score))
}

export async function POST(req: Request) {
  try {
    const { lead_id } = await req.json()
    if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })
    if (!SERVICE_KEY) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }

    // Fetch all interviews for this lead
    const interviewsRes = await fetch(
      `${SB_URL}/rest/v1/interviews?lead_id=eq.${lead_id}&select=id,lead_id,messages,stakeholder_role,leads(org_name,industry,role)`,
      { headers }
    )
    const interviews: InterviewRow[] = await interviewsRes.json()
    if (!interviews || interviews.length === 0) {
      return NextResponse.json({ error: 'No interviews found' }, { status: 404 })
    }

    const primary = interviews[0]
    const allMessages = interviews.flatMap(i => i.messages || [])
    const orgName = primary.leads?.org_name || 'the organization'
    const industry = primary.leads?.industry || 'their industry'

    const dimensions = ['strategy', 'data', 'technology', 'operations', 'talent', 'culture', 'customer']
    const dimensionScores: DimensionScores = {}
    for (const dim of dimensions) {
      dimensionScores[dim] = scoreDimension(allMessages, dim)
    }
    const overallScore = Math.round(Object.values(dimensionScores).reduce((a, b) => a + b, 0) / dimensions.length)

    const transcript = allMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-40)
      .map(m => `${m.role === 'user' ? 'Interviewee' : 'AI'}: ${m.content}`)
      .join('\n')

    const [summaryText, recommendationsText] = await Promise.all([
      generateWithFallback(
        `You are a digital transformation expert. Based on this interview transcript from ${orgName} in ${industry}, write a 3-paragraph executive summary of their digital maturity. Be specific and insightful.\n\nTranscript:\n${transcript}\n\nExecutive Summary:`
      ),
      generateWithFallback(
        `Based on this digital maturity assessment for ${orgName}, provide 5 specific, actionable recommendations to improve their digital maturity. Format as numbered list with clear action items.\n\nScores: ${JSON.stringify(dimensionScores)}\n\nTranscript excerpt:\n${transcript.slice(0, 2000)}\n\nRecommendations:`
      ),
    ])

    // Save report
    const reportRes = await fetch(`${SB_URL}/rest/v1/reports`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        lead_id,
        overall_score: overallScore,
        dimension_scores: dimensionScores,
        executive_summary: summaryText,
        recommendations: recommendationsText,
        status: 'complete',
      }),
    })
    const reportData = await reportRes.json()
    if (!reportRes.ok) {
      return NextResponse.json({ error: 'Failed to save report', details: reportData }, { status: 500 })
    }

    // Send email if we have one
    const leadRes = await fetch(`${SB_URL}/rest/v1/leads?id=eq.${lead_id}&select=email,org_name`, { headers })
    const leads = await leadRes.json()
    const lead = leads?.[0]
    if (lead?.email && resend) {
      try {
        await resend.emails.send({
          from: 'Connai <noreply@connai.linkgrow.io>',
          to: lead.email,
          subject: `Your Digital Maturity Report is Ready — ${lead.org_name || 'Your Organization'}`,
          html: `<h2>Your report is ready!</h2><p>Score: ${overallScore}/100</p><p><a href="https://connai.linkgrow.io/report/${lead_id}">View your full report</a></p>`,
        })
      } catch { /* email is best-effort */ }
    }

    return NextResponse.json({ success: true, report_id: reportData[0]?.id, lead_id, overall_score: overallScore })
  } catch (err) {
    console.error('Report generation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
