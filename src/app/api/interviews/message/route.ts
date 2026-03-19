import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import { Resend } from 'resend'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL      = process.env.NEXT_PUBLIC_URL ?? 'https://connai.linkgrow.io'
const resend = new Resend(process.env.RESEND_API_KEY)

const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY })
const cerebras = createOpenAI({ baseURL: 'https://api.cerebras.ai/v1', apiKey: process.env.CEREBRAS_API_KEY ?? '' })

// ── Dimension-specific question banks [AI-01] ──
// 8 dimensions × 3 targeted questions each
const DIMENSION_QUESTIONS: Record<string, string[]> = {
  strategy: [
    'How clearly is digital transformation reflected in your current business strategy or roadmap?',
    'Who owns the digital agenda in your organisation — and how much exec-level buy-in is there?',
    'How do you currently prioritise digital investments versus day-to-day operational spend?',
  ],
  'customer experience': [
    'How do your customers currently interact with you digitally — website, app, portal, or other channels?',
    'When a customer has a problem, how quickly can your team resolve it using your current digital tools?',
    'How do you collect and act on digital customer feedback today?',
  ],
  'operations & automation': [
    'Which of your core business processes are still manual or paper-based?',
    'Where have you introduced automation or workflow tools, and what has been the impact?',
    'How integrated are your key operational systems — for example, does data flow between finance, sales, and operations?',
  ],
  'data & analytics': [
    'How do leaders in your organisation currently make decisions — mainly gut feel, reports, or real-time data?',
    'Do you have a single source of truth for customer or operational data, or is it spread across multiple systems?',
    'How confident are you in the quality and completeness of the data you collect today?',
  ],
  'technology infrastructure': [
    'How old is your core technology stack, and how often do you face downtime or integration pain?',
    'Are your systems predominantly on-premise, cloud-based, or a mix?',
    'How do you currently handle software updates, security patches, and technical debt?',
  ],
  'talent & culture': [
    'How digitally confident would you say your team is on average — do people embrace new tools or resist them?',
    'When you introduce new technology, how do you typically handle training and adoption?',
    'Do you currently have dedicated digital or data roles, or is that work absorbed by generalist staff?',
  ],
  innovation: [
    'When was the last time your organisation tried a genuinely new digital approach — and what happened?',
    'How do you currently stay informed about digital tools or trends relevant to your industry?',
    'Is there a budget or process for running small digital experiments or pilots?',
  ],
  cybersecurity: [
    'How do you currently manage access control — who can see what data in your organisation?',
    'Have you experienced any data loss, breach attempt, or ransomware incident in the past two years?',
    'What is your current approach to staff training on phishing, passwords, and data handling?',
  ],
}

const DIM_KEYS = Object.keys(DIMENSION_QUESTIONS)

/** Infer which dimensions have already been substantially discussed from transcript */
function coveredDimensions(msgs: Array<{role: string; content: string}>): Set<string> {
  const covered = new Set<string>()
  const assistantText = msgs
    .filter(m => m.role === 'assistant')
    .map(m => m.content.toLowerCase())
    .join(' ')

  const signals: Record<string, string[]> = {
    strategy: ['strategy', 'roadmap', 'digital agenda', 'exec', 'investment', 'prioriti'],
    'customer experience': ['customer', 'portal', 'app', 'channel', 'interact', 'feedback', 'resolve'],
    'operations & automation': ['manual', 'paper', 'automation', 'workflow', 'process', 'integrated', 'operational'],
    'data & analytics': ['data', 'analytics', 'decision', 'report', 'dashboard', 'source of truth'],
    'technology infrastructure': ['infrastructure', 'stack', 'cloud', 'on-premise', 'downtime', 'patch', 'security'],
    'talent & culture': ['talent', 'culture', 'training', 'adoption', 'staff', 'team', 'confident', 'resistant'],
    innovation: ['innovat', 'experiment', 'pilot', 'trend', 'new tool', 'trial'],
    cybersecurity: ['cybersecurity', 'access control', 'breach', 'ransomware', 'phishing', 'password'],
  }

  for (const [dim, kws] of Object.entries(signals)) {
    if (kws.filter(k => assistantText.includes(k)).length >= 2) {
      covered.add(dim)
    }
  }
  return covered
}

/** Pick the next dimension to probe */
function nextDimension(msgs: Array<{role: string; content: string}>, turnIndex: number): string {
  const covered = coveredDimensions(msgs)
  const uncovered = DIM_KEYS.filter(d => !covered.has(d))
  if (uncovered.length === 0) return DIM_KEYS[turnIndex % DIM_KEYS.length]
  // Rotate through uncovered in fixed priority order
  return uncovered[0]
}

/** Pick a question from a dimension that hasn't been asked yet */
function pickQuestion(dim: string, msgs: Array<{role: string; content: string}>): string {
  const asked = msgs.filter(m => m.role === 'assistant').map(m => m.content)
  const pool = DIMENSION_QUESTIONS[dim] ?? DIMENSION_QUESTIONS.strategy
  return pool.find(q => !asked.some(a => a.includes(q.slice(0, 40)))) ?? pool[0]
}

async function getInterviewContext(token: string) {
  const ivRes = await fetch(
    `${SB_URL}/rest/v1/interviews?token=eq.${token}&select=id,lead_id,stakeholder_name,stakeholder_role,stakeholder_email&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
  )
  if (!ivRes.ok) return null
  const ivRows = await ivRes.json()
  if (!ivRows.length) return null
  const iv = ivRows[0]
  const leadRes = await fetch(
    `${SB_URL}/rest/v1/leads?id=eq.${iv.lead_id}&select=org_name,industry&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
  )
  const leadRows = leadRes.ok ? await leadRes.json() : []
  const lead = leadRows[0] ?? {}
  return {
    id: iv.id, lead_id: iv.lead_id,
    name: iv.stakeholder_name || 'there',
    role: iv.stakeholder_role || 'team member',
    email: iv.stakeholder_email || null,
    org: lead.org_name || 'your organisation',
    industry: lead.industry ? ` in the ${lead.industry} sector` : '',
  }
}

function buildSystemPrompt(
  ctx: Awaited<ReturnType<typeof getInterviewContext>>,
  msgs: Array<{role: string; content: string}>,
  isFirstMessage: boolean
): string {
  if (!ctx) return ''

  if (isFirstMessage) {
    return `You are a warm, professional digital transformation consultant conducting a structured assessment interview with ${ctx.name}, ${ctx.role} at ${ctx.org}${ctx.industry}.

Your goal: gather rich qualitative data across 8 dimensions of digital maturity through natural conversation.

Rules:
- Ask ONE question at a time
- Keep replies under 65 words
- Acknowledge their answer briefly before the next question (2–5 words max)
- First message: introduce yourself warmly, mention this is a 20-minute conversation, then ask: "What is your primary digital challenge right now?"
- Never repeat a question already asked`
  }

  const turnIndex = Math.floor(msgs.filter(m => m.role === 'assistant').length)
  const dim = nextDimension(msgs, turnIndex)
  const suggestedQ = pickQuestion(dim, msgs)

  return `You are a warm, professional digital transformation consultant conducting a structured assessment interview.

Organisation: ${ctx.org}${ctx.industry}
Stakeholder: ${ctx.name}, ${ctx.role}

Rules:
- Ask ONE question at a time
- Keep replies under 65 words total (acknowledgement + question)
- Acknowledge their last answer in 2–5 words, then ask the next question
- Current dimension to explore: **${dim}**
- Suggested question for this dimension: "${suggestedQ}"
- You may rephrase or adapt the suggested question based on what they've shared
- Never ask a question already asked in this conversation`
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown'
    if (!rateLimit(ip, 30)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { token, messages, stream: wantStream } = await req.json()
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    const ctx = await getInterviewContext(token)
    if (!ctx) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    const count = (messages ?? []).length
    const isFirstMessage = count === 1
    const isDone = count >= 16

    if (isDone) {
      await fetch(`${SB_URL}/rest/v1/interviews?id=eq.${ctx.id}`, {
        method: 'PATCH',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'complete', transcript: messages }),
      })
      if (ctx.email && resend) {
        const reportUrl = `https://connai.linkgrow.io/report/${ctx.lead_id}`
        resend.emails.send({
          from: 'Connai <noreply@connai.linkgrow.io>',
          to: ctx.email,
          subject: `Thank you for completing your interview \u2014 ${ctx.org}`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0E1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#151B23;border:1px solid #1e2a36;border-radius:16px;overflow:hidden;max-width:560px;"><tr><td style="background:#0D5C63;padding:24px 36px;"><span style="color:#fff;font-size:20px;font-weight:700;">Connai</span></td></tr><tr><td style="padding:36px;"><h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Thank you, ${ctx.name}!</h2><p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 20px;">Your interview for <strong style="color:#fff;">${ctx.org}</strong> is now complete. Our AI is analysing your responses across 8 dimensions of digital maturity.</p><p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 28px;">Your report will be ready within minutes.</p><a href="${reportUrl}" style="display:inline-block;background:#0D5C63;color:#fff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;">View report \u2192</a></td></tr><tr><td style="padding:20px 36px;border-top:1px solid #1e2a36;"><p style="color:#334155;font-size:12px;margin:0;">Connai \u00b7 connai.linkgrow.io</p></td></tr></table></td></tr></table></body></html>`,
        }).catch(() => {})
      }
      // Update lead status + fire background report generation
      // (mirrors interviews/complete PATCH but inline, since streaming frontend
      // no longer calls that endpoint after the streaming refactor)
      try {
        const allRes = await fetch(
          `${SB_URL}/rest/v1/interviews?lead_id=eq.${ctx.lead_id}&select=id,status`,
          { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
        )
        if (allRes.ok) {
          const allInterviews: Array<{ id: string; status: string }> = await allRes.json()
          const total     = allInterviews.length
          const completed = allInterviews.filter(iv => iv.status === 'complete').length
          let newLeadStatus: string | null = null
          if (completed === total && total > 0) {
            newLeadStatus = 'interviews_complete'
          } else if (completed > 0) {
            newLeadStatus = 'interviews_in_progress'
          }
          if (newLeadStatus) {
            await fetch(`${SB_URL}/rest/v1/leads?id=eq.${ctx.lead_id}`, {
              method: 'PATCH',
              headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newLeadStatus }),
            })
          }
          // Fire-and-forget: pre-generate report when all done
          if (newLeadStatus === 'interviews_complete') {
            fetch(`${APP_URL}/api/report/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lead_id: ctx.lead_id }),
            }).catch(() => {})
          }
        }
      } catch { /* non-fatal — interview is still marked complete */ }

      return NextResponse.json({ reply: null, isDone: true })
    }

    const systemPrompt = buildSystemPrompt(ctx, messages ?? [], isFirstMessage)
    const msgs = messages as Array<{ role: 'user' | 'assistant'; content: string }>

    // ── [AI-02] Streaming path ──
    if (wantStream) {
      try {
        const result = streamText({
          model: groq('qwen-qwq-32b'),
          system: systemPrompt,
          messages: msgs,
          temperature: 0.7,
          maxTokens: 300,
        })
        return result.toDataStreamResponse()
      } catch {
        // Fall through to non-streaming fallback
      }
    }

    // ── Non-streaming path (fallback + legacy clients) ──
    const models = [groq('qwen-qwq-32b'), groq('llama-3.3-70b-versatile'), cerebras('llama3.1-8b')]
    let reply = 'Thank you for sharing that. Could you tell me more about your current technology challenges?'
    for (const model of models) {
      try {
        const { text } = await generateText({
          model, system: systemPrompt,
          messages: msgs,
          temperature: 0.7, maxTokens: 300,
        })
        if (text && text.trim().length > 10) { reply = text.trim(); break }
      } catch { continue }
    }
    return NextResponse.json({ reply, isDone: false })
  } catch (err) {
    console.error('Message error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
