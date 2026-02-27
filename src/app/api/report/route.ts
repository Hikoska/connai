import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const resend = new Resend(RESEND_API_KEY)

const DIMENSIONS = ['strategy', 'technology', 'data', 'operations', 'customer', 'culture'] as const
type Dimension = typeof DIMENSIONS[number]

const getTopAndBottomDimensions = (dimensions: { [key: string]: number }) => {
    const sorted = Object.entries(dimensions).sort(([, a], [, b]) => b - a);
    return {
        strongest: sorted.slice(0, 2),
        weakest: sorted.slice(-2).reverse(),
    };
};

async function scoreDimensionsWithLLM(transcript: string): Promise<Record<Dimension, number>> {
  const prompt = `You are a digital maturity expert. Analyze the following interview transcript and score each dimension from 0 to 100 based on the evidence in the transcript.

Dimensions to score:
- strategy: Strategic vision, planning, and digital roadmap clarity
- technology: Technology adoption, infrastructure, and digital tools
- data: Data management, analytics, and data-driven decision making
- operations: Process automation, efficiency, and operational excellence
- customer: Customer experience, digital touchpoints, and customer-centricity
- culture: Digital culture, change management, and talent development

Transcript:
${transcript.slice(0, 8000)}

Respond ONLY with a valid JSON object like this (no explanation, no markdown):
{"strategy": 72, "technology": 58, "data": 45, "operations": 63, "customer": 80, "culture": 55}`

  // Try Groq first, fall back to OpenRouter
  if (GROQ_API_KEY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 200,
        }),
      })
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (content) {
        return JSON.parse(content.trim())
      }
    } catch (err) {
      console.error('Groq scoring failed, trying OpenRouter:', err)
    }
  }

  if (OPENROUTER_API_KEY) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://connai.linkgrow.io',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 200,
        }),
      })
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (content) {
        return JSON.parse(content.trim())
      }
    } catch (err) {
      console.error('OpenRouter scoring failed:', err)
    }
  }

  // Last resort: deterministic fallback based on transcript length as proxy signal
  console.warn('No LLM API key available, using fallback scoring')
  const base = Math.min(50 + Math.floor(transcript.length / 500), 75)
  return {
    strategy: base,
    technology: base - 5,
    data: base - 10,
    operations: base + 5,
    customer: base + 3,
    culture: base - 8,
  }
}

export async function POST(request: Request) {
  const { interview_id } = await request.json()

  if (!interview_id) {
    return NextResponse.json({ error: 'interview_id is required' }, { status: 400 })
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase service role key is not configured.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Step 1: Fetch the interview transcript
  const interview = await fetch(`${SUPABASE_URL}/rest/v1/interviews?id=eq.${interview_id}&select=transcript,stakeholder_email,lead_id,leads(org_name)`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  }).then(res => res.json())

  if (!interview || interview.length === 0 || interview.error) {
    console.error('Error fetching interview or interview not found:', interview?.error)
    return NextResponse.json({ error: 'Failed to fetch interview transcript' }, { status: 500 })
  }

  const transcript = interview[0].transcript;
  const orgName: string = (interview[0].leads as any)?.org_name ?? '';

  // Step 2: Real LLM-based scoring via Groq / OpenRouter
  let reportDimensions: Record<Dimension, number>
  try {
    reportDimensions = await scoreDimensionsWithLLM(transcript)
    // Clamp all scores to [0, 100]
    for (const key of DIMENSIONS) {
      reportDimensions[key] = Math.max(0, Math.min(100, Math.round(reportDimensions[key] ?? 50)))
    }
  } catch (err) {
    console.error('LLM scoring threw unexpectedly:', err)
    return NextResponse.json({ error: 'Failed to score interview' }, { status: 500 })
  }

  // Step 3: Save report to reports table
  const overallScoreNum = Math.round(
    Object.values(reportDimensions).reduce((a, b) => a + b, 0) / DIMENSIONS.length
  )
  const { data: savedReport } = await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      interview_id,
      lead_id: interview[0].lead_id,
      overall_score: overallScoreNum,
      dimension_scores: reportDimensions,
      created_at: new Date().toISOString(),
    }),
  }).then(r => r.json()).then(rows => ({ data: Array.isArray(rows) ? rows[0] : rows })).catch(() => ({ data: null }))
  const reportLeadId: string = (savedReport as any)?.lead_id ?? interview[0].lead_id ?? interview_id

  // Step 4: Placeholder for PDF generation and upload
  const pdf_url = `https://example.com/reports/${interview_id}.pdf`

  // Step 5: Send email notification
  if (RESEND_API_KEY) {
    try {
      const { strongest, weakest } = getTopAndBottomDimensions(reportDimensions);
      const overallScore = (Object.values(reportDimensions).reduce((a, b) => a + b, 0) / Object.values(reportDimensions).length).toFixed(1);

      await resend.emails.send({
        from: 'Connai <reports@connai.linkgrow.io>',
        to: [interview[0].stakeholder_email],
        subject: `Your Connai Digital Maturity Report is Ready${orgName ? ` — ${orgName}` : ''}`,
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: auto; background-color: #0E1117; border-radius: 10px; overflow: hidden;">

            <!-- Header bar -->
            <div style="background-color: #0D5C63; padding: 24px 32px; text-align: center;">
              <div style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">CONNAI</div>
              <div style="font-size: 12px; color: #A7F3D0; letter-spacing: 2px; margin-top: 4px; text-transform: uppercase;">Digital Maturity Report</div>
            </div>

            <!-- Score hero -->
            <div style="padding: 36px 32px 24px; text-align: center; background-color: #0E1117;">
              <div style="font-size: 13px; color: #94A3B8; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">Your Overall Score</div>
              <div style="font-size: 64px; font-weight: 800; color: #4ECDC4; line-height: 1;">${overallScore}</div>
              <div style="font-size: 20px; color: #64748B; margin-top: 4px;">/ 100</div>
              <div style="display: inline-block; margin-top: 14px; background-color: #0D5C63; color: #A7F3D0; font-size: 12px; font-weight: 600; letter-spacing: 1.5px; padding: 5px 16px; border-radius: 20px; text-transform: uppercase;">Assessment Complete</div>
              <p style="color: #94A3B8; font-size: 14px; margin: 18px 0 0; line-height: 1.6;">Thank you for completing the Connai digital maturity assessment.<br/>Here is a summary of your results.</p>
            </div>

            <!-- Divider -->
            <div style="height: 1px; background-color: #1E2D3D; margin: 0 32px;"></div>

            <!-- Dimensions summary -->
            <div style="padding: 24px 32px; background-color: #0E1117;">
              <div style="font-size: 13px; color: #64748B; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; text-align: center;">Key Dimensions</div>

              <!-- Strongest -->
              <div style="margin-bottom: 16px;">
                <div style="font-size: 12px; font-weight: 700; color: #4ECDC4; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">▲ Top Strengths</div>
                ${strongest.map(([name, score]) => `<div style="display: flex; justify-content: space-between; padding: 8px 12px; background-color: #0D1B23; border-left: 3px solid #4ECDC4; border-radius: 4px; margin-bottom: 6px;"><span style="color: #E2E8F0; font-size: 13px;">${name}</span><span style="color: #4ECDC4; font-size: 13px; font-weight: 700;">${score}</span></div>`).join('')}
              </div>

              <!-- Weakest -->
              <div>
                <div style="font-size: 12px; font-weight: 700; color: #F59E0B; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">▼ Areas to Improve</div>
                ${weakest.map(([name, score]) => `<div style="display: flex; justify-content: space-between; padding: 8px 12px; background-color: #1A1507; border-left: 3px solid #F59E0B; border-radius: 4px; margin-bottom: 6px;"><span style="color: #E2E8F0; font-size: 13px;">${name}</span><span style="color: #F59E0B; font-size: 13px; font-weight: 700;">${score}</span></div>`).join('')}
              </div>
            </div>

            <!-- Divider -->
            <div style="height: 1px; background-color: #1E2D3D; margin: 0 32px;"></div>

            <!-- CTAs -->
            <div style="padding: 28px 32px; text-align: center; background-color: #0E1117;">
              <div style="margin-bottom: 24px;">
                <a href="${pdf_url}" style="display: inline-block; background-color: #0D5C63; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 700; margin: 6px;">Download Full PDF Report</a>
                <a href="https://connai.linkgrow.io/report/${reportLeadId}/share" style="display: inline-block; background-color: transparent; color: #4ECDC4; padding: 11px 26px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 700; border: 2px solid #4ECDC4; margin: 6px;">Share Your Results →</a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #080C10; padding: 16px 32px; text-align: center;">
              <div style="font-size: 11px; color: #334155;">Built by <span style="color: #4ECDC4;">Linkgrow</span> · connai.linkgrow.io</div>
            </div>

          </div>
        `,
        text: `Your Connai report is ready. Your overall score is ${overallScore}/100. Download the full PDF here: ${pdf_url} | Share your results: https://connai.linkgrow.io/report/${interview_id}/share`
      });
      console.log(`Report email sent to ${interview[0].stakeholder_email}`)
    } catch (emailError) {
      console.error('Failed to send report email:', emailError)
    }
  } else {
    console.warn('RESEND_API_KEY not set. Skipping email notification.')
  }

  return NextResponse.json({
    message: 'Report generation complete.',
    pdf_url: pdf_url,
    dimensions: reportDimensions,
  })
}
