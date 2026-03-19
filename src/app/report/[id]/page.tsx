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
type Report = {
  id: string
  lead_id: string
  overall_score: number
  dimensions: Dimension[]
  executive_summary?: string
  completedCount?: number
}

function getMaturityTier(score: number) {
  if (score >= 86) return { label: 'Leading',    color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-700/40' }
  if (score >= 71) return { label: 'Advanced',   color: 'text-teal-400',    bg: 'bg-teal-900/30',    border: 'border-teal-700/40'    }
  if (score >= 51) return { label: 'Defined',    color: 'text-blue-400',    bg: 'bg-blue-900/30',    border: 'border-blue-700/40'    }
  if (score >= 31) return { label: 'Developing', color: 'text-amber-400',   bg: 'bg-amber-900/30',   border: 'border-amber-700/40'   }
  return               { label: 'Ad Hoc',     color: 'text-red-400',     bg: 'bg-red-900/30',     border: 'border-red-700/40'     }
}

const TIER_META: Record<'quick_wins' | 'six_month' | 'long_term', { label: string; color: string; desc: string }> = {
  quick_wins: { label: 'Quick Wins',      color: 'text-teal-400',  desc: 'Achievable in 0–3 months' },
  six_month:  { label: '6-Month Goals',   color: 'text-blue-400',  desc: 'Mid-term improvements'   },
  long_term:  { label: 'Strategic Goals', color: 'text-purple-400',desc: '12+ month transformation'},
}

type ActionPlan = {
  quick_wins: string[]
  six_month:  string[]
  long_term:  string[]
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
            <div className="h-7 w-16 bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-7 w-24 bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="h-4 w-24 bg-slate-800 rounded animate-pulse mb-2" />
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-6" />
          <div className="h-16 w-24 bg-slate-800 rounded animate-pulse mb-2" />
          <div className="h-3 w-48 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="h-5 w-36 bg-slate-800 rounded animate-pulse mb-4" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-4/6 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="h-5 w-40 bg-slate-800 rounded animate-pulse mb-6" />
          <div className="space-y-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1.5">
                  <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-12 bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="h-2 bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Generating state ──
function GeneratingState({ pollCount }: { pollCount: number }) {
  const dots = [0,1,2].map(i => (
    <span key={i} className="inline-block w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"
      style={{ animationDelay: `${i * 0.15}s` }} />
  ))
  const pct = Math.min(90, Math.round((pollCount / POLL_MAX_ATTEMPTS) * 90))
  return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <span className="text-white font-bold text-lg">Connai</span>
        </div>
      </div>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-teal-900/30 border border-teal-800/40 flex items-center justify-center mx-auto mb-6">
            <div className="flex gap-1 items-center">{dots}</div>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Generating your report</h1>
          <p className="text-slate-400 text-sm mb-6">
            Our AI is analysing your interview responses across 8 dimensions of digital maturity.
            This usually takes 30–60 seconds.
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-slate-600 text-xs mt-2">Checking for results…</p>
        </div>
      </main>
    </div>
  )
}

function ReportContent() {
  const params      = useParams()
  const searchParams = useSearchParams()
  const id          = params?.id as string | undefined
  const forceUnlock = searchParams?.get('unlock') === '1'

  const [report,        setReport]        = useState<Report | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  // [UX-NEW-C] Polling state for report generation
  const [generating,    setGenerating]    = useState(false)
  const pollCountRef    = useRef(0)
  const pollTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pollCount,     setPollCount]     = useState(0)

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
      window.location.reload()
    } catch { /* silent */ } finally { setRegeneration(false) }
  }, [id, regenerating])

  // [UX-NEW-C] Fetch report with polling fallback
  const fetchReport = useCallback(() => {
    if (!id) return
    const sb = createClient(SB_URL, SB_ANON)
    sb.from('reports')
      .select('id,lead_id,overall_score,dimension_scores,dimensions,created_at')
      .eq('lead_id', id)
      .maybeSingle()
      .then(({ data, error: e }) => {
        if (e) {
          setError('Failed to load report. Please try refreshing.')
          setLoading(false)
          setGenerating(false)
          return
        }
        if (!data) {
          // Report not ready yet — poll if we haven't exceeded the limit
          if (pollCountRef.current < POLL_MAX_ATTEMPTS) {
            pollCountRef.current++
            setPollCount(pollCountRef.current)
            setLoading(false)
            setGenerating(true)
            pollTimerRef.current = setTimeout(fetchReport, POLL_INTERVAL_MS)
          } else {
            setGenerating(false)
            setError(
              'Your report is taking longer than expected. Please refresh in a moment or click Regenerate.'
            )
            setLoading(false)
          }
          return
        }
        // Report found!
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
        setGenerating(false)
        const dims: Dimension[] = Array.isArray(data.dimensions)
          ? data.dimensions
          : Object.entries(data.dimension_scores ?? {}).map(([name, score]) => ({ name, score: score as number }))
        setReport({
          id: data.id,
          lead_id: data.lead_id,
          overall_score: data.overall_score ?? 0,
          dimensions: dims,
          completedCount: undefined,
        })
        if (data.created_at) {
          setReportDate(new Date(data.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }))
        }
        setLoading(false)
      })
  }, [id])

  // Cleanup poll timer on unmount
  useEffect(() => {
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current) }
  }, [])

  useEffect(() => {
    if (!id) return
    fetchReport()
  }, [id, fetchReport])

  useEffect(() => {
    if (!report || !id) return
    fetch(`/api/report/${id}/executive-summary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setExecSummary(d.summary ?? null); setExecTier(d.tier ?? null) } })
      .catch(() => {})
  }, [report, id])

  useEffect(() => {
    if (!id) return
    const checkPaid = () => fetch(`/api/report/${id}/paid-status`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.paid) { setPaid(true); setPaidChecked(true) }
        else setPaidChecked(true)
      })
      .catch(() => setPaidChecked(true))
    checkPaid()
  }, [id])

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
  const strong     = dims.filter(d => d.score >= 70);
  const developing = dims.filter(d => d.score >= 40 && d.score < 70);
  const critical   = dims.filter(d => d.score < 40);

  // Loading states
  if (loading) return <ReportSkeleton />;
  if (generating) return <GeneratingState pollCount={pollCount} />;

  if (error || !report) return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-12 h-12 bg-amber-900/30 border border-amber-800/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-amber-400 text-xl">⚠️</span>
        </div>
        <p className="text-lg font-semibold text-white mb-2">Report unavailable</p>
        <p className="text-slate-400 text-sm mb-5">{error ?? 'This report could not be loaded.'}</p>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Generating…' : 'Generate report'}
        </button>
      </div>
    </div>
  );

  const isPaid = paid || forceUnlock;

  return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white">
      <a href="#main-report" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-teal-600 text-white px-4 py-2 rounded z-50">Skip to report</a>

      <div className="border-b border-slate-800 px-6 py-4 sticky top-0 z-40 bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-white font-bold text-lg tracking-tight">Connai</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm hidden sm:block">Digital Maturity Report</span>
            <button type="button" onClick={handleShare} title="Share report" className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors">
              {shareCopied ? <><Check size={13} className="text-teal-400" /><span className="text-teal-400">Copied!</span></> : <><Share2 size={13} /><span>Share</span></>}
            </button>
            <button type="button" onClick={handleRegenerate} title="Regenerate report" disabled={regenerating} className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors">
              <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{regenerating ? 'Running…' : 'Regenerate'}</span>
            </button>
            {isPaid && (
              <button type="button" onClick={handleDownloadPdf} title="Download PDF" className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                <Download size={13} />
                <span className="hidden sm:inline">PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <main id="main-report" className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-slate-400 text-sm mb-1">{reportDate}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Your Digital Maturity Report</h1>
            </div>
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${tier.bg} ${tier.color} ${tier.border}`}>{tier.label}</span>
          </div>
          <div className="mt-6 flex items-end gap-3">
            <span className={`text-6xl sm:text-7xl font-extrabold leading-none tabular-nums ${tier.color}`}>{overallScore}</span>
            <span className="text-slate-500 text-lg mb-1">/ 100</span>
          </div>
          <p className="text-slate-400 text-sm mt-2">Overall digital maturity score across 8 dimensions</p>
          {report.completedCount === 1 && <p className="mt-3 text-xs text-slate-500 bg-slate-800/60 inline-block px-3 py-1 rounded-full">Based on 1 completed interview</p>}
          {(report.completedCount ?? 0) >= 2 && <p className="mt-3 text-xs text-slate-500 bg-slate-800/60 inline-block px-3 py-1 rounded-full">Based on {report.completedCount} completed interviews</p>}
        </div>

        {report && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-4">Executive Summary</h2>
            {execSummary ? (
              <>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{execSummary}</p>
                {execTier && <p className="mt-3 text-xs text-slate-500">Maturity Tier: <span className="text-teal-400 font-medium">{execTier}</span></p>}
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="w-4 h-4 border border-teal-500 border-t-transparent rounded-full animate-spin" />
                Generating your executive summary…
              </div>
            )}
          </div>
        )}

        {dims.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Dimension Scores</h2>
              <span className="text-xs text-slate-500 hidden sm:block">vs industry median</span>
            </div>
            <div className="space-y-5">
              {dims.map((d) => {
                const insight = d.insight ?? null
                const benchmark = INDUSTRY_BENCHMARKS[d.name.toLowerCase()] ?? 55
                const delta = d.score - benchmark
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-300 capitalize">{d.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${delta >= 10 ? 'bg-teal-900/40 text-teal-300' : delta >= 0 ? 'bg-blue-900/40 text-blue-300' : 'bg-red-900/40 text-red-300'}`}>{delta >= 0 ? '+' : ''}{delta} vs median</span>
                        <span className="text-sm font-semibold text-white tabular-nums w-8 text-right">{d.score}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.score}%`, background: d.score >= 70 ? '#14b8a6' : d.score >= 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    {insight && <p className="text-xs text-slate-500 mt-1 leading-snug">{insight}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {dims.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-5">Maturity Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Strengths', items: strong, color: 'text-teal-400', bg: 'bg-teal-900/20', border: 'border-teal-800/40' },
                { label: 'Developing', items: developing, color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-800/40' },
                { label: 'Critical Gaps', items: critical, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-800/40' },
              ].map(({ label, items, color, bg, border }) => (
                <div key={label} className={`${bg} border ${border} rounded-xl p-4`}>
                  <p className={`text-xs font-semibold ${color} mb-2 uppercase tracking-wide`}>{label}</p>
                  {items.length === 0 ? <p className="text-slate-500 text-xs">None</p> : (
                    <ul className="space-y-1.5">
                      {items.map(d => (
                        <li key={d.name} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <span className={`${color} mt-0.5 flex-shrink-0`}>●</span>
                          {d.name} <span className="text-slate-500 ml-auto pl-2 flex-shrink-0">{d.score}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {dims.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-5">Radar Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {dims.map(d => (
                <div key={d.name} className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <div className={`text-2xl font-bold tabular-nums ${d.score >= 70 ? 'text-teal-400' : d.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{d.score}</div>
                  <div className="text-xs text-slate-400 mt-1 capitalize leading-tight">{d.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

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
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading…</p>
        </div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  )
}
