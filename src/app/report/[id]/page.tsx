'use client';
import { Share2, Check, Download, RefreshCw } from 'lucide-react';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { FeedbackBar } from '@/components/FeedbackBar';

export const dynamic = 'force-dynamic'

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const POLL_INTERVAL_MS = 5_000
const POLL_MAX_ATTEMPTS = 12 // 60 seconds

type Dimension = { name: string; score: number; insight?: string }
type ReportData = {
  id?: string
  overall_score?: number
  dimensions: Dimension[]
  executive_summary?: string
  completedCount?: number
}

function getMaturityTier(score: number) {
  if (score >= 91) return { label: 'Digital Leader',   color: 'text-emerald-400' }
  if (score >= 76) return { label: 'Advanced',         color: 'text-teal-400' }
  if (score >= 61) return { label: 'Established',      color: 'text-sky-400' }
  if (score >= 41) return { label: 'Developing',       color: 'text-yellow-400' }
  if (score >= 21) return { label: 'Emerging',         color: 'text-orange-400' }
  return                  { label: 'Digitally Dormant',color: 'text-red-400' }
}

const TIER_META: Record<string, { label: string; desc: string; color: string }> = {
  quick_wins: { label: 'Quick Wins',    desc: '0–30 days',          color: 'text-teal-400' },
  six_month:  { label: '6-Month Plan', desc: '1–6 months',         color: 'text-sky-400' },
  long_term:  { label: 'Long-Term',    desc: '12+ month transformation', color: 'text-violet-400' },
}

type ActionPlan = {
  quick_wins: string[]
  six_month:  string[]
  long_term:  string[]
  summary?:   string
}

const INDUSTRY_BENCHMARKS: Record<string, number> = {
  strategy: 58, 'customer experience': 62, 'operations & automation': 55,
  'data & analytics': 50, 'technology infrastructure': 60, 'talent & culture': 53,
  'security & compliance': 57, innovation: 48,
}

// ── Skeleton loading component ──
function ReportSkeleton() {
  return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-6 py-4 bg-slate-950/95">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="h-5 w-20 bg-slate-800 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-7 w-16 bg-slate-800 rounded animate-pulse" />
            <div className="h-7 w-24 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-full bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-3/5 bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </main>
    </div>
  )
}

// ── Generating state ──
function GeneratingState({ reportId }: { reportId: string }) {
  const dots = Array.from({ length: 3 }, (_, i) => (
    <span key={i} className="inline-block w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
  ))
  return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="border-b border-slate-800 px-6 py-4 bg-slate-950/95">
        <div className="max-w-4xl mx-auto">
          <span className="text-white font-bold text-lg tracking-tight">Connai</span>
        </div>
      </div>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-teal-900/30 border border-teal-800/40 flex items-center justify-center mx-auto mb-6">
            <div className="flex gap-1 items-center">{dots}</div>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Generating your report</h1>
          <p className="text-slate-400 text-sm mb-6">
            Our AI is analysing your interview responses across 8 dimensions of
            digital maturity. This takes 30–60 seconds.
          </p>
          <p className="text-slate-600 text-xs">Report ID: {reportId}</p>
        </div>
      </main>
    </div>
  )
}

function ReportInner() {
  const params     = useParams()
  const searchParams = useSearchParams()
  const id         = params?.id as string

  const forceUnlock = searchParams.get('force') === '1'

  const [report,       setReport]       = useState<ReportData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [generating,   setGenerating]   = useState(false)
  const [pollCount,    setPollCount]    = useState(0)
  const pollRef        = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [execSummary,   setExecSummary]   = useState<string | null>(null)
  const [execTier,      setExecTier]      = useState<string | null>(null)
  const [plan,          setPlan]          = useState<ActionPlan | null>(null)
  const [planLoading,   setPlanLoading]   = useState(false)
  const [paid,          setPaid]          = useState(false)
  const [paidChecked,   setPaidChecked]   = useState(false)

  const handleDownloadPdf = () => {
    if (!id) return
    const a = document.createElement('a')
    a.href = `/api/report/${id}/pdf`
    a.download = 'connai-report.pdf'
    a.click()
  }

  const handleShare = useCallback(() => {
    const url = window.location.href
    navigator.clipboard.writeText(url).catch(() => {})
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2500)
  }, [])
  const [shareCopied,    setShareCopied]    = useState(false)
  const [regenerating,   setRegeneration]   = useState(false)
  const [reportDate,     setReportDate]     = useState('')

  const handleRegenerate = useCallback(async () => {
    if (!id || regenerating) return
    setRegeneration(true)
    try {
      await fetch('/api/report/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: id }) })
    } finally {
      setRegeneration(false)
    }
  }, [id, regenerating])

  // ── Fetch report ──
  const fetchReport = useCallback(async () => {
    if (!id) return
    const sb = createClient(SB_URL, SB_ANON)
    const { data } = await sb
      .from('reports')
      .select('id, overall_score, dimension_scores, executive_summary, created_at')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    return data
  }, [id])

  // ── Poll for report ──
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!id) { setLoading(false); return }
      const data = await fetchReport()
      if (cancelled) return
      if (data) {
        const dims = Object.entries((data.dimension_scores as Record<string, number>) ?? {}).map(([name, score]) => ({ name, score: score as number }))
        setReport({ id: data.id, overall_score: data.overall_score, dimensions: dims, executive_summary: data.executive_summary ?? undefined })
        if (data.created_at) setReportDate(new Date(data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))
        setLoading(false)
        setGenerating(false)
      } else {
        setGenerating(true)
        setLoading(false)
        setPollCount(c => c + 1)
      }
    }
    run()
    return () => { cancelled = true }
  }, [id, fetchReport])

  // Re-poll if generating
  useEffect(() => {
    if (!generating) return
    if (pollCount >= POLL_MAX_ATTEMPTS) return
    pollRef.current = setTimeout(() => {
      fetchReport().then(data => {
        if (data) {
          const dims = Object.entries((data.dimension_scores as Record<string, number>) ?? {}).map(([name, score]) => ({ name, score: score as number }))
          setReport({ id: data.id, overall_score: data.overall_score, dimensions: dims, executive_summary: data.executive_summary ?? undefined })
          setGenerating(false)
        } else {
          setPollCount(c => c + 1)
        }
      })
    }, POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [generating, pollCount, fetchReport])

  // ── Check paid status ──
  useEffect(() => {
    if (!id) return
    fetch(`/api/report/${id}/paid-status`)
      .then(r => r.ok ? r.json() : { paid: false })
      .then(d => { setPaid(!!d.paid); setPaidChecked(true) })
      .catch(() => setPaidChecked(true))
  }, [id])

  // ── Fetch executive summary ──
  useEffect(() => {
    if (!report || !id) return
    fetch(`/api/report/${id}/executive-summary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setExecSummary(d.summary ?? null); setExecTier(d.tier ?? null) } })
      .catch(() => {})
  }, [report, id])

  // ── Fetch action plan (only when paid) ──
  useEffect(() => {
    if (!report || !id) return
    if (!paid && !forceUnlock && !paidChecked) return
    if (!paid && !forceUnlock) return
    setPlanLoading(true)
    fetch(`/api/report/${id}/action-plan`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPlan(d); })
      .catch(() => {})
      .finally(() => setPlanLoading(false));
  }, [report, paid, paidChecked, id]);

  const dims = report?.dimensions ?? [];
  const overallScore = dims.length > 0
    ? Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length)
    : 0;
  const tier = getMaturityTier(overallScore);

  if (loading) return <ReportSkeleton />
  if (generating) return <GeneratingState reportId={id ?? ''} />
  if (!report) {
    return (
      <div id="report-root" className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Report not found or still generating.</p>
          <a href="/dashboard" className="text-teal-400 underline text-sm">Go to dashboard</a>
        </div>
      </div>
    )
  }

  const isPaid = paid || forceUnlock;

  return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white">
      <a href="#main-report" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-teal-600 text-white px-4 py-2 rounded z-50">Skip to report</a>

      <div className="border-b border-slate-800 px-6 py-4 sticky top-0 z-40 bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-white font-bold text-lg">Connai</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm hidden sm:block">Digital Maturity Report</span>
            <button type="button" onClick={handleShare} title="Share report" className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors">
              {shareCopied ? <><Check size={13} className="text-teal-400" /><span className="text-teal-400">Copied!</span></> : <><Share2 size={13} /><span>Share</span></>}
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('I just completed a digital maturity audit for my organisation — here\'s our AI-generated report:')}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank" rel="noopener noreferrer"
              title="Share on X"
              className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.737-8.835L1.254 2.25H8.08l4.26 5.637 5.903-5.637zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank" rel="noopener noreferrer"
              title="Share on LinkedIn"
              className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <button type="button" onClick={handleRegenerate} title="Regenerate report" disabled={regenerating} className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 px-2.5 py-1.5 rounded-lg transition-colors">
              <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={handleDownloadPdf} title="Download PDF" className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors">
              <Download size={13} />
            </button>
          </div>
        </div>
      </div>

      <main id="main-report" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Overall score card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Digital Maturity Report</h1>
              {reportDate && <p className="text-slate-500 text-sm">Generated {reportDate}</p>}
            </div>
            <div className="text-center sm:text-right">
              <div className={`text-5xl sm:text-6xl font-black ${tier.color} leading-none`}>{overallScore}</div>
              <div className="text-slate-500 text-xs mt-1">out of 100</div>
              <div className={`text-sm font-semibold ${tier.color} mt-1`}>{tier.label}</div>
            </div>
          </div>
        </div>

        {/* Dimension scores */}
        {dims.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-5">Dimension Scores</h2>
            <div className="space-y-3">
              {[...dims].sort((a, b) => b.score - a.score).map(d => {
                const pct = Math.min(100, Math.max(0, d.score))
                const benchmark = INDUSTRY_BENCHMARKS[d.name.toLowerCase()] ?? 55
                const color = pct >= 70 ? 'bg-teal-500' : pct >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300 capitalize">{d.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Benchmark: {benchmark}</span>
                        <span className="text-sm font-semibold text-white">{d.score}</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`absolute left-0 top-0 h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      <div className="absolute top-0 h-full w-0.5 bg-slate-500 opacity-60" style={{ left: `${benchmark}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Executive Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white mb-4">Executive Summary</h2>
          {execSummary ? (
            <>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{execSummary}</p>
              {execTier && <p className="mt-3 text-xs text-slate-500">Maturity Tier: <span className="text-teal-400 font-medium">{execTier}</span></p>}
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <div className="w-4 h-4 border border-teal-500 border-t-transparent rounded-full animate-spin" />
              Generating executive summary…
            </div>
          )}
        </div>

        {/* Dimension insights */}
        {dims.some(d => d.insight) && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-4">Dimension Insights</h2>
            <div className="space-y-4">
              {dims.filter(d => d.insight).map(d => (
                <div key={d.name}>
                  <h3 className="text-sm font-semibold text-teal-400 capitalize mb-1">{d.name}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{d.insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Industry comparison */}
        {dims.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-4">vs. Industry Benchmarks</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {dims.map(d => {
                const benchmark = INDUSTRY_BENCHMARKS[d.name.toLowerCase()] ?? 55
                const delta = d.score - benchmark
                const color = delta >= 5 ? 'text-teal-400' : delta >= -5 ? 'text-yellow-400' : 'text-red-400'
                return (
                  <div key={d.name} className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <div className={`text-lg font-bold ${color}`}>{delta >= 0 ? '+' : ''}{delta}</div>
                    <div className="text-xs text-slate-500 capitalize mt-0.5 truncate">{d.name}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Priority matrix */}
        {dims.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-4">Priority Matrix</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['Critical gaps', 'Strengths'] as const).map((label) => {
                const isGap = label === 'Critical gaps'
                const sorted = isGap
                  ? [...dims].sort((a, b) => a.score - b.score).slice(0, 3)
                  : [...dims].sort((a, b) => b.score - a.score).slice(0, 3)
                const color = isGap ? 'text-red-400' : 'text-teal-400'
                return (
                  <div key={label} className="bg-slate-800/40 rounded-xl p-4">
                    <h3 className={`text-sm font-semibold ${color} mb-3`}>{label}</h3>
                    <ul className="space-y-1.5">
                      {sorted.length === 0 ? <p className="text-slate-500 text-xs">None</p> : (
                        sorted.map(d => (
                          <li key={d.name} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className={`${color} mt-0.5 flex-shrink-0`}>●</span>
                            {d.name} <span className="text-slate-500 ml-auto pl-2 flex-shrink-0">{d.score}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* AI Action Plan */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          {!isPaid ? (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">AI Action Plan</h2>
                  <p className="text-slate-400 text-sm mt-1">Your digital maturity scores are ready. Unlock the AI action plan and strategic roadmap.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-teal-900/30 text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-teal-700/40 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />Premium
                </span>
              </div>
              <ul className="space-y-2 mb-6">
                {['Full 3-tier action plan (Quick Wins / 6-Month / Strategic)', 'Priority improvement roadmap', 'Branded PDF export', 'Shareable report link', `All ${dims.length || 8} dimension scores + industry benchmarks`].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                    <span className="text-teal-400 mt-0.5 flex-shrink-0">✔</span>{item}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => window.location.href = `/checkout?reportId=${id}`} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                Unlock for $49 · Secure checkout
              </button>
              <p className="text-xs text-slate-500 mt-3">One-time payment · Powered by Stripe · Instant access</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-5">AI Action Plan</h2>
              {planLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <div className="w-4 h-4 border border-teal-500 border-t-transparent rounded-full animate-spin" />
                  Generating your personalised action plan…
                </div>
              ) : plan ? (
                <div className="space-y-8">
                  {(['quick_wins', 'six_month', 'long_term'] as const).map(t => {
                    const meta = TIER_META[t];
                    const items = plan[t] ?? [];
                    if (items.length === 0) return null;
                    return (
                      <div key={t}>
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className={`text-base font-semibold ${meta.color}`}>{meta.label}</h3>
                          <span className="text-xs text-slate-500">{meta.desc}</span>
                        </div>
                        <ul className="space-y-2">
                          {items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                              <span className={`${meta.color} mt-0.5 flex-shrink-0 font-bold`}>{i + 1}.</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {plan.summary && (
                    <div className="mt-6 bg-teal-950/40 border border-teal-800/30 rounded-xl px-5 py-4">
                      <p className="text-xs font-semibold text-teal-400 mb-1.5 uppercase tracking-wider">Key Insight</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{plan.summary}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Action plan could not be generated. Try regenerating the report.</p>
              )}
            </>
          )}
        </div>

        <FeedbackBar reportId={id ?? ''} />
      </main>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div id="report-root" className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    }>
      <ReportInner />
    </Suspense>
  )
}
