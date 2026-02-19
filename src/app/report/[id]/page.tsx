import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatReportForFree } from '@/lib/report'

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  high: 'bg-orange-50 border-orange-200 text-orange-700',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  low: 'bg-blue-50 border-blue-200 text-blue-700',
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: report } = await supabase
    .from('reports')
    .select('*, audits(title, org_id, organisations(name, owner_id, plan_type))')
    .eq('id', params.id)
    .single()

  if (!report || report.audits?.organisations?.owner_id !== user.id) redirect('/dashboard')

  const isPaid = report.tier === 'paid'
  const content = isPaid ? report.content : formatReportForFree(report.content)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
          </div>
          <div className="flex items-center gap-3">
            {isPaid && (
              <button className="btn-secondary text-sm py-2 px-4">⬇ Download PDF</button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔭</span>
              <span className="font-bold text-teal-500">Linkgrow Lense</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Report header */}
        <div className="bg-teal-500 text-white rounded-2xl p-8 mb-8">
          <div className="text-sm opacity-75 mb-2">Digital Maturity Audit Report</div>
          <h1 className="text-3xl font-bold mb-2">{report.audits?.title}</h1>
          <div className="text-teal-100">{report.audits?.organisations?.name}</div>
          <div className="mt-6 flex items-center gap-6">
            <div>
              <div className="text-5xl font-bold">{content?.digital_maturity_score}<span className="text-2xl text-teal-200">/10</span></div>
              <div className="text-sm text-teal-200 mt-1">Digital Maturity Score</div>
            </div>
            <div className="flex-1 text-sm text-teal-100">{content?.score_rationale}</div>
          </div>
        </div>

        {/* Executive Summary */}
        <section className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
          <p className="text-gray-600 leading-relaxed">{content?.executive_summary}</p>
        </section>

        {/* Key Strengths */}
        {content?.key_strengths && (
          <section className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Key Strengths</h2>
            <ul className="space-y-2">
              {content.key_strengths.map((strength: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-teal-500 mt-0.5">✓</span>
                  <span className="text-gray-600">{strength}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Paid content or upgrade gate */}
        {isPaid ? (
          <>
            {/* Risk Register */}
            {content?.risk_register && content.risk_register.length > 0 && (
              <section className="card mb-6">
                <h2 className="text-xl font-bold mb-4">Risk Register ({content.risk_register.length} risks identified)</h2>
                <div className="space-y-3">
                  {content.risk_register.map((risk: any) => (
                    <div key={risk.id} className={`border rounded-xl p-4 ${SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.medium}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{risk.id}: {risk.title}</span>
                        <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-white/50">{risk.severity}</span>
                      </div>
                      <p className="text-sm mb-2">{risk.description}</p>
                      {risk.evidence && <p className="text-xs italic opacity-70">Evidence: "{risk.evidence}"</p>}
                      <div className="mt-2 text-sm font-medium">→ {risk.recommended_action}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Action Plan */}
            {content?.action_plan && content.action_plan.length > 0 && (
              <section className="card mb-6">
                <h2 className="text-xl font-bold mb-4">Action Plan</h2>
                <div className="space-y-4">
                  {content.action_plan.map((phase: any) => (
                    <div key={phase.phase} className="border-l-4 border-teal-500 pl-4">
                      <div className="font-semibold text-teal-700">Phase {phase.phase}: {phase.title}</div>
                      <div className="text-xs text-gray-400 mb-2">{phase.timeline}</div>
                      <ul className="space-y-1">
                        {phase.actions.map((action: string, i: number) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-teal-400 mt-0.5">•</span>{action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          /* Upgrade gate */
          <div className="relative">
            <div className="card mb-6 blur-sm pointer-events-none select-none">
              <h2 className="text-xl font-bold mb-4">Risk Register (blurred)</h2>
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="h-4 bg-red-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-red-100 rounded w-full mb-1" />
                    <div className="h-3 bg-red-100 rounded w-2/3" />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md mx-4 border border-teal-100">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="text-xl font-bold mb-2">
                  We found {content?.risk_count ?? '?'} risks & {content?.opportunity_count ?? '?'} opportunities
                </h3>
                <p className="text-gray-500 mb-6">Upgrade to see the full risk register, opportunity map, and phased action plan.</p>
                <Link href="/checkout" className="btn-primary block text-center">
                  Unlock full report →
                </Link>
                <p className="text-xs text-gray-400 mt-3">Starter pack from $500 · 5 interviews included</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
