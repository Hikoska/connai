import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mhuofnkbjbanrdvvktps.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY

const resend = new Resend(RESEND_API_KEY)

const getTopAndBottomDimensions = (dimensions: { [key: string]: number }) => {
    const sorted = Object.entries(dimensions).sort(([, a], [, b]) => b - a);
    return {
        strongest: sorted.slice(0, 2),
        weakest: sorted.slice(-2).reverse(),
    };
};

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
  const { data: interview, error } = await fetch(`${SUPABASE_URL}/rest/v1/interviews?id=eq.${interview_id}&select=transcript,stakeholder_email`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  }).then(res => res.json())

  if (error || !interview || interview.length === 0) {
    console.error('Error fetching interview or interview not found:', error)
    return NextResponse.json({ error: 'Failed to fetch interview transcript' }, { status: 500 })
  }

  const transcript = interview[0].transcript;

  // Step 2: Placeholder for LLM-based report generation logic
  console.log('Successfully fetched transcript. Placeholder for report generation.')

  const reportDimensions = {
    strategy: Math.floor(Math.random() * 101),
    technology: Math.floor(Math.random() * 101),
    data: Math.floor(Math.random() * 101),
    operations: Math.floor(Math.random() * 101),
    customer: Math.floor(Math.random() * 101),
    culture: Math.floor(Math.random() * 101),
  };

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
            <div style="text-align: center; margin-top: 20px;">
              <a href="${pdf_url}" style="background-color: #0D5C63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download Full PDF Report</a>
            </div>
          </div>
        `,
        text: `Your Connai report is ready. Your overall score is ${overallScore}/100. Download the full PDF here: ${pdf_url}`
      });
      console.log(`Report email sent to ${interview[0].stakeholder_email}`)
    } catch (emailError) {
      console.error('Failed to send report email:', emailError)
      // Do not block the response for an email failure
    }
  } else {
    console.warn('RESEND_API_KEY not set. Skipping email notification.')
  }

  return NextResponse.json({
    message: 'Report generation placeholder complete.',
    pdf_url: pdf_url,
    dimensions: reportDimensions,
  })
}
