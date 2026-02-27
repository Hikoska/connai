import React from 'react'
import PrintButton from '@/components/PrintButton';
import CopyLinkButton from '@/components/CopyLinkButton';
import { notFound } from 'next/navigation'

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface Lead {
  org_name: string
  overall_score: number | null
  dimension_scores: Record<string, number> | null
}

async function getLead(id: string): Promise<Lead | null> {
  const anonH = { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, Accept: 'application/json' }
  const svcH  = { apikey: SB_SVC,  Authorization: `Bearer ${SB_SVC}`,  Accept: 'application/json' }

  // 1. Fetch lead name (anon key — leads table has anon SELECT policy)
  const leadRes = await fetch(
    `${SB_URL}/rest/v1/leads?id=eq.${id}&select=org_name&limit=1`,
    { headers: anonH, cache: 'no-store' }
  )
  if (!leadRes.ok) return null
  const leadRows = await leadRes.json()
  if (!Array.isArray(leadRows) || !leadRows[0]) return null
  const lead = leadRows[0]

  // 2. Fetch scores from reports (service role key — reports has no anon SELECT policy)
  const repRes = await fetch(
    `${SB_URL}/rest/v1/reports?lead_id=eq.${id}&select=overall_score,dimension_scores&order=created_at.desc&limit=1`,
    { headers: svcH, cache: 'no-store' }
  )
  if (!repRes.ok) return null
  const repRows = await repRes.json()
  if (!Array.isArray(repRows) || !repRows[0]) return null
  const rep = repRows[0]

  return {
    org_name: lead.org_name,
    overall_score: rep.overall_score,
    dimension_scores: rep.dimension_scores,
  }
}

const INDUSTRY_MEDIANS: Record<string, number> = {
  'Digital Strategy & Leadership': 48,
  'Customer Experience & Digital Channels': 52,
  'Operations & Process Automation': 44,
  'Data & Analytics': 47,
  'Technology Infrastructure': 53,
  'Talent & Digital Culture': 41,
  'Innovation & Agile Delivery': 38,
  'Cybersecurity & Risk': 46,
};

const DIMENSION_ICONS: Record<string, string> = {
  'Digital Strategy & Leadership': '🧭',
  'Customer Experience & Digital Channels': '🤝',
  'Operations & Process Automation': '⚙️',
  'Data & Analytics': '📊',
  'Technology Infrastructure': '🏗️',
  'Talent & Digital Culture': '🧠',
  'Innovation & Agile Delivery': '🚀',
  'Cybersecurity & Risk': '🔐',
};

function getMaturityTier(score: number) {
  if (score >= 91) return { label: 'Digital Leader',   color: 'text-yellow-300', bg: 'bg-yellow-900/20 border-yellow-500/30' };
  if (score >= 76) return { label: 'Advanced',         color: 'text-teal-300',   bg: 'bg-teal-900/20 border-teal-500/30'   };
  if (score >= 61) return { label: 'Established',      color: 'text-blue-300',   bg: 'bg-blue-900/20 border-blue-500/30'   };
  if (score >= 41) return { label: 'Developing',       color: 'text-amber-300',  bg: 'bg-amber-900/20 border-amber-500/30' };
  if (score >= 21) return { label: 'Emerging',         color: 'text-orange-300', bg: 'bg-orange-900/20 border-orange-500/30' };
  return              { label: 'Digitally Dormant', color: 'text-red-300',    bg: 'bg-red-900/20 border-red-500/30'     };
}

function ringColor(score: number) {
  if (score >= 70) return '#14b8a6'  // teal-500
  if (score >= 40) return '#f59e0b'  // amber-500
  return '#ef4444'                    // red-500
}

function barColor(score: number) {
  if (score >= 70) return 'bg-teal-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id)
  if (!lead) {
    return {
      title: 'Digital Maturity Report — ConnAI by Linkgrow',
      description: 'See how your organisation ranks across 8 digital maturity dimensions.',
    }
  }

  const overallScore = lead.overall_score ?? null
  const tier = overallScore !== null ? getMaturityTier(overallScore) : null
  const orgName = lead.org_name ?? 'Your Organisation'

  const topDims = lead.dimension_scores
    ? Object.entries(lead.dimension_scores)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 2)
        .map(([name]) => name.split('&')[0].trim())
    : []

  const title = overallScore !== null
    ? `${orgName}: ${overallScore}/100 — ${tier?.label ?? 'Digital Maturity'}`
    : `${orgName} — Digital Maturity Assessment`

  const descParts = [
    tier ? `Rated ${tier.label}` : null,
    topDims.length ? `Strong in ${topDims.join(' & ')}` : null,
    'Assessed across 8 digital dimensions. Built by Linkgrow.',
  ].filter(Boolean)

  const description = descParts.join('. ')

  const url = `https://connai.linkgrow.io/report/${params.id}/share`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'ConnAI by Linkgrow',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function SharePage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id)
  if (!lead) notFound()

  const overallScore  = lead.overall_score ?? null
  const tier          = overallScore !== null ? getMaturityTier(overallScore) : null

  const topDimensions = lead.dimension_scores
    ? Object.entries(lead.dimension_scores)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
    : []

  // SVG ring maths
  const R = 54, CIRC = 2 * Math.PI * R
  const ringArc = overallScore !== null ? (overallScore / 100) * CIRC : 0

  return (
    <div className="min-h-screen bg-[#0E1117] flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0E1117]/80 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm tracking-wide">Connai</span>
          <span className="text-slate-600 text-xs">·</span>
          <span className="text-slate-400 text-xs">Digital Maturity Report</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyLinkButton />
          <PrintButton />
          <a
            href={`/report/${params.id}`}
            className="text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-lg hover:bg-teal-500/30 transition"
          >
            View Full Report →
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 py-12 max-w-xl mx-auto w-full space-y-10">

        {/* Org name */}
        <div className="text-center space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Digital Maturity Assessment</p>
          <h1 className="text-2xl font-bold text-white">{lead.org_name}</h1>
        </div>

        {/* Score ring + tier */}
        {overallScore !== null && tier && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" style={{ ["--ring-arc" as string]: `${ringArc}` } as React.CSSProperties}>
                <circle cx="60" cy="60" r={R} fill="none" stroke="#1e293b" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r={R}
                  fill="none"
                  stroke={ringColor(overallScore)}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${ringArc} ${CIRC}`}
                  className="score-ring-progress"
                />
                <style>{`
                  .score-ring-progress {
                    stroke-dashoffset: var(--ring-arc);
                    animation: ring-fill 0.8s ease-out forwards;
                  }
                  @keyframes ring-fill {
                    from { stroke-dashoffset: var(--ring-arc); }
                    to   { stroke-dashoffset: 0; }
                  }
                `}</style>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{overallScore}</span>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${tier.bg} ${tier.color}`}>
              {tier.label}
            </span>
          </div>
        )}

        {/* Top 3 dimension cards */}
        {topDimensions.length > 0 && (
          <div className="w-full space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-widest text-center">Top Strengths</p>
            {topDimensions.map(([name, score]) => {
              const median = INDUSTRY_MEDIANS[name] ?? 50;
              const delta  = (score as number) - median;
              const icon   = DIMENSION_ICONS[name] ?? '📌';
              return (
                <div key={name} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{icon}</span>
                      <span className="text-sm text-slate-200 font-medium">{name}</span>
                    </div>
                    <span className="text-lg font-bold text-white">{score}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor(score as number)} rounded-full`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Industry median: {median}</span>
                    <span className={delta >= 0 ? 'text-teal-400' : 'text-red-400'}>
                      {delta >= 0 ? '+' : ''}{delta} vs median
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CTA */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <p className="text-white font-semibold text-lg">See the full picture</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Get the complete report — all 8 dimensions, a personalised action plan, and
            industry benchmarks across every area.
          </p>
          <a
            href={`/report/${params.id}`}
            className="inline-block w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm px-8 py-3.5 rounded-xl transition"
          >
            Unlock Action Plan — $49
          </a>
          <p className="text-xs text-slate-600">One-time payment · Instant access · No subscription</p>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <p className="text-slate-600 text-xs">Share this summary with your leadership team.</p>
          <a href="https://linkgrow.io" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity shrink-0">
            <span className="text-slate-500 text-xs uppercase tracking-widest font-medium">Built by</span>
            <div className="bg-slate-800 rounded px-2 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/linkgrow-logo.png" alt="Linkgrow" style={{ height: '14px', width: 'auto', display: 'block' }} />
            </div>
          </a>
        </div>
      </footer>

    </div>
  )
}
