// Phase 1 stub — Gemini AI integration added in Phase 2
export const generateContent = async (..._args: unknown[]) => ({ response: { text: () => '' } })
export const REPORT_ANALYSIS_PROMPT = (_transcripts: string, _orgContext: string) => ''
export const INTERVIEW_ANALYSIS_PROMPT = (_question: string, _context: string) => ''
export const getInterviewModel = () => ({
  generateContent: async () => ({ response: { text: () => '' } }),
  startChat: () => ({ sendMessage: async () => ({ response: { text: () => '' } }) }),
})
