import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const { interview_id } = await req.json()
  const supabase = createClient()

  // Get interview + audit + transcripts
  const { data: interview } = await supabase
    .from('interviews')
    .select('*, audits(*, organisations(*))')
    .eq('id', interview_id)
    .single()

  if (!interview) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: transcripts } = await supabase
    .from('transcripts')
    .select('role, content, sequence_num')
    .eq('interview_id', interview_id)
    .order('sequence_num')

  // Get all completed interviews for this audit
  const { data: allInterviews } = await supabase
    .from('interviews')
    .select('id, subject_name, subject_role, subject_department')
    .eq('audit_id', interview.audit_id)
    .eq('status', 'completed')

  // Build transcript string
  const transcriptText = transcripts?.map(t => `${t.role.toUpperCase()}: ${t.content}`).join('\n') || ''
  const orgContext = `Company: ${interview.audits?.organisations?.name}. Context: ${interview.audits?.context || ''}`

  // Generate analysis
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  const analysisPrompt = `You are an expert digital transformation consultant. Analyse this interview transcript from a digital maturity audit and produce a structured JSON report.

Organisation context: ${orgContext}
Interviewee: ${interview.subject_name} (${interview.subject_role}, ${interview.subject_department})

Interview transcript:
${transcriptText}

Return ONLY valid JSON (no markdown) with this structure:
{
  "executive_summary": "2-3 paragraph summary",
  "digital_maturity_score": 6,
  "score_rationale": "explanation",
  "key_strengths": ["strength 1", "strength 2"],
  "risk_register": [{"id":"R001","title":"Risk","description":"Desc","severity":"high","category":"Security","evidence":"Quote","recommended_action":"Action"}],
  "opportunity_map": [{"id":"O001","title":"Opportunity","description":"Desc","impact":"high","effort":"medium","category":"Automation","estimated_benefit":"Benefit"}],
  "action_plan": [{"phase":1,"title":"Immediate","timeline":"0-30 days","actions":["Action 1"],"expected_outcome":"Outcome"}],
  "department_insights": {}
}`

  const result = await model.generateContent(analysisPrompt)
  let reportContent: any = {}
  try {
    const text = result.response.text().replace(/```json\n?|```/g, '').trim()
    reportContent = JSON.parse(text)
  } catch (e) {
    reportContent = { executive_summary: 'Report generation in progress.', digital_maturity_score: 5 }
  }

  // Determine tier
  const { data: org } = await supabase
    .from('organisations')
    .select('plan_type')
    .eq('id', interview.audits?.org_id)
    .single()

  const tier = (org?.plan_type && org.plan_type !== 'free') ? 'paid' : 'free'

  // Save report
  const { data: report } = await supabase
    .from('reports')
    .insert({
      audit_id: interview.audit_id,
      org_id: interview.audits?.org_id,
      tier,
      content: reportContent,
    })
    .select()
    .single()

  // Update audit status
  await supabase.from('audits')
    .update({ status: 'complete' })
    .eq('id', interview.audit_id)

  return NextResponse.json({ report_id: report?.id })
}
