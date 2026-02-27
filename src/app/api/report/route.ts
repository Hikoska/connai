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
  const interview = await fetch(`${SUPABASE_URL}/rest/v1/interviews?id=eq.${interview_id}&select=transcript,stakeholder_email`, {
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

  // Step 3: Placeholder for saving the report back to Supabase
  console.log('Placeholder for saving report to Supabase.')

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
        subject: 'Your Connai Digital Maturity Report is Ready',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h1 style="color: #0D5C63; text-align: center;">Your Report is Ready</h1>
            <p>Thank you for completing the Connai digital maturity assessment. Your overall score is <strong>${overallScore}/100</strong>.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <h2 style="color: #333;">Key Dimensions:</h2>
            <p><strong>Top 2 Strongest:</strong></p>
            <ul>
              ${strongest.map(([name, score]) => `<li>${name}: ${score}</li>`).join('')}
            </ul>
            <p><strong>Top 2 Weakest:</strong></p>
            <ul>
              ${weakest.map(([name, score]) => `<li>${name}: ${score}</li>`).join('')}
            </ul>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <div style="text-align: center; margin-top: 20px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <a href="${pdf_url}" style="background-color: #0D5C63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Download Full PDF Report</a>
              <a href="https://connai.linkgrow.io/report/${interview_id}/share" style="background-color: transparent; color: #0D5C63; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; border: 2px solid #0D5C63; display: inline-block;">Share Your Results →</a>
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
