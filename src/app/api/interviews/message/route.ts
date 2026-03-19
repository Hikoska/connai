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
  'security & compliance': [
    'Has your organisation experienced a data breach or security incident in the past two years?',
    'How do you currently manage access control and user permissions across your systems?',
    'Are you subject to any data protection regulations, and how confident are you in your compliance posture?',
  ],
  innovation: [
    'When was the last time your organisation adopted a genuinely new digital tool or process — and what drove that decision?',
    'How do you stay informed about relevant technology trends and competitive digital moves?',
    'Do you have a budget or process for experimenting with new digital approaches?',
  ],
}

const ALL_DIMENSIONS = Object.keys(DIMENSION_QUESTIONS)

function coveredDimensions(messages: Array<{ role: string; content: string }>): string[] {
  const covered: string[] = []
  const combined = messages.map(m => m.content.toLowerCase()).join(' ')
  for (const dim of ALL_DIMENSIONS) {
    const keywords = DIMENSION_QUESTIONS[dim].flatMap(q =>
      q.toLowerCase().split(/\s+/).filter(w => w.length > 6)
    )
    if (keywords.some(k => combined.includes(k))) covered.push(dim)
  }
  return covered
}

function nextDimension(messages: Array<{ role: string; content: string }>): string {
  const covered = coveredDimensions(messages)
  const uncovered = ALL_DIMENSIONS.filter(d => !covered.includes(d))
  return uncovered[0] ?? ALL_DIMENSIONS[Math.floor(Math.random() * ALL_DIMENSIONS.length)]
}

function pickQuestion(dim: string, messages: Array<{ role: string; content: string }>): string {
  const pool = DIMENSION_QUESTIONS[dim] ?? DIMENSION_QUESTIONS.strategy
  const asked = messages.filter(m => m.role === 'assistant').map(m => m.content)
  return pool.find(q => !asked.some(a => a.includes(q.slice(0, 40)))) ?? pool[0]
}

function buildSystemPrompt(
  ctx: { name: string; role: string; org: string },
  messages: Array<{ role: string; content: string }>,
  isFirst: boolean,
): string {
  const covered = coveredDimensions(messages)
  const uncovered = ALL_DIMENSIONS.filter(d => !covered.includes(d))
  const turnIndex = messages.filter(m => m.role === 'user').length
  const isNearEnd = turnIndex >= 6

  return `You are a digital maturity consultant conducting a structured interview with ${ctx.name}, ${ctx.role} at ${ctx.org}.

Your goal is to assess their organisation across 8 digital maturity dimensions:
${ALL_DIMENSIONS.map((d, i) => `${i + 1}. ${d}${covered.includes(d) ? ' \u2713' : ''}`).join('\n')}

Dimensions not yet explored: ${uncovered.length > 0 ? uncovered.join(', ') : 'all covered \u2014 wrap up'}

INSTRUCTIONS:
- Ask ONE clear, conversational question per turn
- Prioritise dimensions not yet explored
- Listen actively and acknowledge their answer briefly before your question
- ${isNearEnd ? 'You are near the end \u2014 cover any remaining dimensions and start wrapping up' : 'Keep the conversation flowing naturally'}
- ${isFirst ? `Start with a warm welcome: "Hi ${ctx.name}, thanks for taking the time. Let\'s explore how ${ctx.org} is progressing digitally. I\'ll ask you ${8 + 2} questions across 8 areas \u2014 there are no right or wrong answers. Ready to start?"` : 'Do NOT re-introduce yourself'}
- Maximum 2 short sentences before your question
- Do NOT list or number the dimensions in your response
- Never ask about pricing, budgets in absolute terms, or personally sensitive topics

SCORING RUBRIC (internal, do not reveal):
1\u201330: Ad hoc \u2014 no formal approach
31\u201350: Developing \u2014 some tools, inconsistent
51\u201370: Defined \u2014 structured processes
71\u201385: Advanced \u2014 data-driven, integrated
86\u2013100: Leading \u2014 continuous innovation`
}

type InterviewContext = {
  lead_id: string
  name: string
  role: string
  org: string
  email: string | null
}

async function getInterviewContext(token: string): Promise<InterviewContext | null> {
  const res = await fetch(
    `${SB_URL}/rest/v1/interviews?token=eq.${token}&select=id,lead_id,stakeholder_name,stakeholder_role,stakeholder_email&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return null
  const rows = await res.json()
  if (!rows?.length) return null
  const iv = rows[0]
  const leadRes = await fetch(
    `${SB_URL}/rest/v1/leads?id=eq.${iv.lead_id}&select=id,org_name&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
  )
  const leads = leadRes.ok ? await leadRes.json() : []
  const lead = leads[0]
  return {
    lead_id: iv.lead_id,
    name: iv.stakeholder_name || 'there',
    role: iv.stakeholder_role || 'stakeholder',
    org: lead?.org_name || 'your organisation',
    email: iv.stakeholder_email || null,
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting [SEC-B]
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const limited = rateLimit(ip, 'interviews-message', 20, 60_000)
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { token, messages, stream } = await req.json()
    const wantStream = stream === true
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const ctx = await getInterviewContext(token)
    if (!ctx) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    const isFirstMessage = !messages || messages.length === 0
    const turnCount = (messages as Array<{ role: string }>)?.filter(m => m.role === 'user').length ?? 0

    // Check if interview is done (16 user turns)
    const isDone = turnCount >= 16

    if (isDone) {
      // Mark interview complete in DB
      try {
        await fetch(`${SB_URL}/rest/v1/interviews?token=eq.${token}`, {
          method: 'PATCH',
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'complete', transcript: messages }),
        })

        // Send thank-you email to stakeholder [PRD-A]
        const reportUrl = `${APP_URL}/report/${ctx.lead_id}`
        if (ctx.email && resend) {
          resend.emails.send({
            from: 'Connai <noreply@connai.linkgrow.io>',
            to: ctx.email,
            subject: `Your Connai interview is complete \u2014 report incoming`,
            html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0E1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#151B23;border:1px solid #1e2a36;border-radius:16px;overflow:hidden;max-width:560px;"><tr><td style="background:#0D5C63;padding:24px 36px;"><span style="color:#fff;font-size:20px;font-weight:700;">Connai</span></td></tr><tr><td style="padding:36px;"><h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Thank you, ${ctx.name}!</h2><p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 20px;">Your interview for <strong style="color:#fff;">${ctx.org}</strong> is now complete. Our AI is analysing your responses across 8 dimensions of digital maturity.</p><p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 28px;">Your report will be ready within minutes.</p><a href="${reportUrl}" style="display:inline-block;background:#0D5C63;color:#fff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;">View report \u2192</a></td></tr><tr><td style="padding:20px 36px;border-top:1px solid #1e2a36;"><p style="color:#334155;font-size:12px;margin:0;">Connai \u00b7 connai.linkgrow.io</p></td></tr></table></td></tr></table></body></html>`,
          }).catch(() => {})
        }

        // Update lead status based on completion count
        const allRes = await fetch(
          `${SB_URL}/rest/v1/interviews?lead_id=eq.${ctx.lead_id}&select=id,status`,
          { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
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

            // [REV-D] Admin notification: all interviews for this audit are done
            if (resend) {
              const leadRes = await fetch(
                `${SB_URL}/rest/v1/leads?id=eq.${ctx.lead_id}&select=org_name,email&limit=1`,
                { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
              )
              const leads = leadRes.ok ? await leadRes.json() : []
              const lead = leads[0]
              if (lead) {
                resend.emails.send({
                  from: 'Connai <noreply@connai.linkgrow.io>',
                  to: 'lmamet@linkgrow.io',
                  subject: `[Connai] All interviews complete \u2014 ${lead.org_name || 'audit'} | ${ctx.lead_id}`,
                  html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0E1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#151B23;border:1px solid #1e2a36;border-radius:16px;overflow:hidden;max-width:560px;"><tr><td style="background:#0D5C63;padding:24px 36px;"><span style="color:#fff;font-size:20px;font-weight:700;">Connai Admin</span></td></tr><tr><td style="padding:36px;"><h2 style="color:#fff;font-size:22px;margin:0 0 12px;">${'\ud83d\udfe2'} All interviews complete</h2><p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 8px;">Audit: <strong style="color:#fff;">${lead.org_name || 'Unknown org'}</strong></p><p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 20px;">The AI report has been queued for generation. Review below.</p><a href="${APP_URL}/report/${ctx.lead_id}" style="display:inline-block;background:#0D5C63;color:#fff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;margin-right:12px;">View report \u2192</a><a href="${APP_URL}/dashboard" style="display:inline-block;background:#1e293b;color:#94a3b8;font-size:14px;padding:14px 24px;border-radius:50px;text-decoration:none;">Dashboard</a><p style="color:#475569;font-size:12px;margin:24px 0 0;">Lead ID: ${ctx.lead_id}</p></td></tr><tr><td style="padding:20px 36px;border-top:1px solid #1e2a36;"><p style="color:#334155;font-size:12px;margin:0;">Connai Admin Notification \u00b7 connai.linkgrow.io</p></td></tr></table></td></tr></table></body></html>`,
                }).catch(() => {})
              }
            }
          }
        }
      } catch { /* non-fatal \u2014 interview is still marked complete */ }

      return NextResponse.json({ reply: null, isDone: true })
    }

    const systemPrompt = buildSystemPrompt(ctx, messages ?? [], isFirstMessage)
    const msgs = messages as Array<{ role: 'user' | 'assistant'; content: string }>

    // \u2500\u2500 [AI-02] Streaming path \u2500\u2500
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

    // \u2500\u2500 Non-streaming path (fallback + legacy clients) \u2500\u2500
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
    console.error('Interview message error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
