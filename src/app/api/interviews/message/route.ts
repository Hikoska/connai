import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const resend = new Resend(process.env.RESEND_API_KEY)

const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY })
const cerebras = createOpenAI({ baseURL: 'https://api.cerebras.ai/v1', apiKey: process.env.CEREBRAS_API_KEY ?? '' })

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

async function generateReply(systemPrompt: string, msgs: Array<{role: string; content: string}>): Promise<string> {
  const models = [groq('qwen-qwq-32b'), groq('llama-3.3-70b-versatile'), cerebras('llama3.1-8b')]
  for (const model of models) {
    try {
      const { text } = await generateText({
        model, system: systemPrompt,
        messages: msgs as Parameters<typeof generateText>[0]['messages'],
        temperature: 0.7, maxTokens: 300,
      })
      if (text && text.trim().length > 10) return text.trim()
    } catch { continue }
  }
  return 'Thank you for sharing that. Could you tell me more about your current technology challenges?'
}

export async function POST(req: NextRequest) {
  try {
    const { token, messages } = await req.json()
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
      return NextResponse.json({ reply: null, isDone: true })
    }

    const systemPrompt = isFirstMessage
      ? `You are a warm, professional digital transformation consultant conducting a structured assessment interview with ${ctx.name}, ${ctx.role} at ${ctx.org}${ctx.industry}.\n\nYour goal: gather rich qualitative data across 8 dimensions of digital maturity through natural conversation.\n\nRules:\n- Ask ONE question at a time\n- Keep replies under 60 words\n- Acknowledge their answer briefly before asking the next question\n- First message: introduce yourself warmly, mention this is a 20-minute conversation, ask about their role and primary digital challenge\n- Rotate through: strategy, customer experience, operations/automation, data/analytics, technology infrastructure, talent/culture, innovation, cybersecurity\n- Be curious and specific`
      : `You are a warm, professional digital transformation consultant conducting a structured assessment interview.\n\nOrganisation: ${ctx.org}${ctx.industry}\nStakeholder: ${ctx.name}, ${ctx.role}\n\nRules:\n- Ask ONE question at a time\n- Keep replies under 60 words\n- Acknowledge their answer briefly\n- Rotate through dimensions not yet covered: strategy, customer experience, operations/automation, data/analytics, infrastructure, talent/culture, innovation, cybersecurity\n- Reference what they have already said\n- Never repeat questions already asked`

    const reply = await generateReply(systemPrompt, messages)
    return NextResponse.json({ reply, isDone: false })
  } catch (err) {
    console.error('Message error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
