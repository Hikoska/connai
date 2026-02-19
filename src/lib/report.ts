export function formatReportForFree(reportContent: any) {
  if (!reportContent) return null
  return {
    executive_summary: reportContent.executive_summary,
    digital_maturity_score: reportContent.digital_maturity_score,
    score_rationale: reportContent.score_rationale,
    key_strengths: reportContent.key_strengths,
    // Locked for free tier:
    risk_register: null,
    opportunity_map: null,
    action_plan: null,
    department_insights: null,
    is_free_tier: true,
    risk_count: reportContent.risk_register?.length ?? 0,
    opportunity_count: reportContent.opportunity_map?.length ?? 0,
  }
}
