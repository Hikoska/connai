const dimensions = [
  { label: 'Technology Infrastructure', score: 64, color: 'bg-teal-500' },
  { label: 'Data & Analytics',          score: 71, color: 'bg-teal-400' },
  { label: 'Process Automation',        score: 58, color: 'bg-teal-600' },
  { label: 'Customer Experience',       score: 76, color: 'bg-teal-500' },
  { label: 'Digital Culture',           score: 79, color: 'bg-teal-300' },
]

const actions = [
  { title: 'Unify customer data across CRM and support',      effort: 'Medium', impact: 'High' },
  { title: 'Introduce async decision-making documentation',    effort: 'Low',    impact: 'High' },
  { title: 'Automate monthly operational reporting',          effort: 'Medium', impact: 'Medium' },
]

export const ProductScreenshot = () => (
  <section className="py-20 bg-white">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold font-serif mb-4">Your report, ready in days</h2>
      <p className="text-gray-500 mb-8">Score, benchmarks, and a prioritised action plan — all from a 30-minute conversation.</p>

      {/* Browser chrome */}
      <div className="bg-gray-800 rounded-t-lg p-2 flex items-center gap-2">
        <div className="flex space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 bg-gray-700 rounded text-xs text-gray-400 px-3 py-1 text-left">
          app.connai.io/report/acme-corp
        </div>
      </div>

      {/* Report window */}
      <div className="bg-[#F8F6F2] border-x border-b border-gray-800 rounded-b-lg text-left overflow-hidden">

        {/* Report header */}
        <div className="bg-[#0E1117] text-white px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-teal-400 uppercase tracking-widest mb-1">Digital Maturity Report</div>
            <div className="font-bold text-lg">Acme Corp &mdash; Feb 2026</div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-mono font-bold text-teal-400">68</div>
            <div className="text-xs text-gray-400">/100 overall score</div>
            <div className="text-xs text-teal-400 mt-1">&#8679; +9 vs Mauritius median</div>
          </div>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">

          {/* Dimension scores */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Dimension Scores</div>
            <div className="space-y-3">
              {dimensions.map((d) => (
                <div key={d.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{d.label}</span>
                    <span className="font-mono font-bold text-gray-800">{d.score}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${d.color} rounded-full`}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prioritised actions */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Top Action Items</div>
            <div className="space-y-3">
              {actions.map((a, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-sm text-gray-800 font-medium mb-2">{a.title}</div>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Effort: {a.effort}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.impact === 'High' ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'
                    }`}>Impact: {a.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer bar */}
        <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-400">
          <span>Powered by Connai &mdash; AI Digital Maturity Platform</span>
          <span className="text-teal-500 font-medium">Full report &darr; PDF</span>
        </div>

      </div>
    </div>
  </section>
)
