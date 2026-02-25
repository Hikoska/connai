import { notFound } from 'next/navigation'

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface Lead {
  org_name: string
  overall_score: number | null
  dimension_scores: Record<string, number> | null
}

async function getLead(id: string): Promise<Lead | null> {
  const res = await fetch(
    `${SB_URL}/rest/v1/leads?id=eq.${id}&select=org_name,overall_score,dimension_scores&limit=1`,
    {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, Accept: 'application/json' },
      cache: 'no-store',
    }
  )
  if (!res.ok) return null
  const rows = await res.json()
  return Array.isArray(rows) ? (rows[0] ?? null) : null
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-teal-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

export default async function SharePage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id)
  if (!lead) notFound()

  const overallScore = lead.overall_score ?? null
  const topDimensions = lead.dimension_scores
    ? Object.entries(lead.dimension_scores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : []

  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-3xl p-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-1">
          <span className="text-xs text-white/30 uppercase tracking-widest">Digital Maturity Report</span>
          <h1 className="text-2xl font-bold text-white">{lead.org_name}</h1>
        </div>

        {/* Overall Score */}
        {overallScore !== null && (
          <div className="text-center">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Overall Score</p>
            <p className={`text-7xl font-bold ${scoreColor(overallScore)}`} data-testid="share-score">
              {overallScore}
            </p>
            <p className="text-white/30 text-sm mt-1">out of 100</p>
          </div>
        )}

        {/* Top 3 Dimensions */}
        {topDimensions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-white/30 uppercase tracking-widest text-center">Top Dimensions</p>
            {topDimensions.map(([name, score]) => (
              <div key={name} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <span className="text-sm text-white/80">{name}</span>
                <span className={`text-sm font-semibold ${scoreColor(score)}`}>{score}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center pt-2">
          <a
            href={`/report/${params.id}`}
            className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm px-8 py-3 rounded-xl transition"
          >
            Unlock Action Plan — $49
          </a>
          <p className="text-xs text-white/20 mt-3">One-time payment · Instant access · No subscription</p>
        </div>
      </div>
    </div>
  )
}
