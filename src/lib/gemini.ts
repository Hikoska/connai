import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const INTERVIEW_SYSTEM_PROMPT = `You are a highly skilled digital transformation consultant conducting a structured interview as part of a digital maturity audit. Your role is to:

1. Ask clear, open-ended questions about the interviewee's daily work, tools, challenges, and bottlenecks
2. Probe for specifics when answers are vague
3. Identify pain points, inefficiencies, and opportunities
4. Remain neutral and non-judgmental
5. Cover these dimensions in a natural conversation flow:
   - Current tools and systems used daily
   - Manual processes that could be automated
   - Data access and reporting challenges
   - Collaboration and communication friction points
   - Security and compliance awareness
   - Training and capability gaps
   - Ideas and wishlist from the employee perspective

Keep responses concise (2-3 sentences max). Ask one question at a time.
After 12-15 exchanges, wrap up warmly and thank the interviewee.`

export function getInterviewModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: INTERVIEW_SYSTEM_PROMPT,
  })
}

export const REPORT_ANALYSIS_PROMPT = (transcripts: string, orgContext: string) => \`
You are an expert digital transformation consultant. Analyse the following interview transcripts from a digital maturity audit and produce a structured JSON report.

Organisation context: \${orgContext}

Interview transcripts:
\${transcripts}

Return a JSON object with this exact structure:
{
  "executive_summary": "2-3 paragraph summary",
  "digital_maturity_score": <number 1-10>,
  "score_rationale": "explanation",
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "risk_register": [
    {
      "id": "R001",
      "title": "Risk title",
      "description": "Detailed description",
      "severity": "critical|high|medium|low",
      "category": "Security|Data|Process|People|Technology",
      "evidence": "Quote or reference from interviews",
      "recommended_action": "Specific action"
    }
  ],
  "opportunity_map": [
    {
      "id": "O001",
      "title": "Opportunity title",
      "description": "Description",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "category": "Automation|Analytics|Collaboration|Security|Training",
      "estimated_benefit": "Quantified benefit if possible"
    }
  ],
  "action_plan": [
    {
      "phase": 1,
      "title": "Phase title",
      "timeline": "0-30 days|30-90 days|90-180 days|6-12 months",
      "actions": ["action 1", "action 2"],
      "expected_outcome": "outcome"
    }
  ],
  "department_insights": {
    "<department_name>": {
      "maturity_score": <1-10>,
      "key_finding": "Finding",
      "priority_action": "Action"
    }
  }
}
\`
