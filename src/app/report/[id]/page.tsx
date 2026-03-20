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
  dimension_scores?: Record<string, number>
  executive_summary?: string
  completedCount?: number
}

function getMaturityTier(score: number) {
  if (score >= 91) return { label: 'Digital Leader',   color: 'text-emerald-400' }
  if (score >= 76) return { label: 'Advanced',         color: 'text-teal-400' }
  if (score >= 61) return { label: 'Established',      color: 'text-sky-400' }
  if (score >= 41) return { label: 'Developing',       color: 'text-yellow-400' }
  if (score >= 21) return { label: 'Emerging',         color: 'text-orange-400' }
  return               { label: 'Digitally Dormant', color: 'text-red-400' }
}

const INDUSTRY_BENCHMARKS: Record<string, number> = {
  'digital strategy & leadership': 58, 'customer experience & digital channels': 62,
  'operations & process automation': 55, 'data & analytics': 50,
  'technology infrastructure': 60, 'talent & digital culture': 53,
  'innovation & agile delivery': 48, 'cybersecurity & risk': 52,
}

const CATEGORY_CONFIG: Record<string, { label: string; desc: string; color: string }> = {
  quick_wins:  { label: 'Quick Wins',    desc: '0–30 days',          color: 'text-teal-400' },
  six_month:   { label: '6-Month Plan',  desc: '1–6 months',         color: 'text-sky-400' },
  long_term:   { label: 'Long-Term',     desc: '12+ month transformation', color: 'text-violet-400' },
}

type ActionItem = { action: string; dimension: string; impact: string; effort: string }
type ActionPlan = {
  quick_wins: ActionItem[]
  six_month:  ActionItem[]
  long_term:  ActionItem[]
  summary?:   string
}

function ReportSkeleton() {
  return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white px-4 py-8 max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-800 rounded-xl" />
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="h-16 w-16 bg-slate-800 rounded-full mx-auto" />
        <div className="h-6 w-32 bg-slate-800 rounded mx-auto" />
        <div className="h-4 w-24 bg-slate-800 rounded mx-auto" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <div className="h-3 w-40 bg-slate-800 rounded" />
              <div className="h-3 w-8 bg-slate-800 rounded" />
            </div>
            <div className="h-2 bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function GeneratingState({ onPollComplete }: { onPollComplete: (report: ReportData) => void }) {
  const params = useParams()
  const id = params?.id as string | undefined
  const attemptRef = useRef(0)

  useEffect(() => {
    if (!id) return
    const interval = setInterval(async () => {
      attemptRef.current++
      if (attemptRef.current > POLL_MAX_ATTEMPTS) {
        clearInterval(interval)
        return
      }
      try {
        const res = await fetch(`/api/report/${id}/status`)
        if (!res.ok) return
        const { ready, report } = await res.json()
        if (ready && report) {
          clearInterval(interval)
          onPollComplete(report)
        }
      } catch { /* ignore */ }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [id, onPollComplete])

  return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-semibold text-white">Generating your report…</h2>
        <p className="text-slate-400 text-sm max-w-xs">Our AI is analysing the interview responses across 8 dimensions. This takes about 30 seconds.</p>
      </div>
      <p className="text-xs text-slate-600">This page will update automatically.</p>
    </div>
  )
}

function ReportInner() {
  const params    = useParams()
  const searchParams = useSearchParams()
  const id        = params?.id as string | undefined
  const forceUnlock = searchParams.get('force') === '1'

  const supabase  = createClient(SB_URL, SB_ANON)

  const [report,        setReport]        = useState<ReportData | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [generating,    setGenerating]    = useState(false)
  const [paid,          setPaid]          = useState(false)
  const [paidChecked,   setPaidChecked]   = useState(false)
  const [actionPlan,    setActionPlan]    = useState<ActionPlan | null>(null)
  const [planLoading,   setPlanLoading]   = useState(false)
  const [planError,     setPlanError]     = useState<string | null>(null)
  const [execSummary,   setExecSummary]   = useState<string | null>(null)
  const [execLoading,   setExecLoading]   = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [shareDropdown, setShareDropdown] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  // -- Close share dropdown on outside click --
  useEffect(() => {
    if (!shareDropdown) return
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [shareDropdown])

  // -- Load report --
  useEffect(() => {
    if (!id) return
    const loadReport = async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('id, overall_score, dimension_scores, executive_summary')
          .eq('lead_id', id)
          .maybeSingle()
        if (error) throw error
        if (!data) {
          // No report yet -- trigger generation
          setGenerating(true)
        } else {
          // Transform flat dimension_scores object to Dimension[] array
          const rawDims = (data as ReportData & { dimension_scores?: Record<string, number> }).dimension_scores ?? {}
          const dims: Dimension[] = Object.entries(rawDims).map(([name, score]) => ({ name, score: score as number }))
          setReport({ ...(data as ReportData), dimensions: dims })
        }
      } catch (e) {
        setError((e as Error).message || 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    loadReport()
  }, [id])

  // -- Check paid status --
  useEffect(() => {
    if (!id || forceUnlock) { setPaidChecked(true); return }
    fetch(`/api/report/${id}/paid-status`)
      .then(r => r.json())
      .then(({ paid: p }) => { setPaid(!!p); setPaidChecked(true) })
      .catch(() => setPaidChecked(true))
  }, [id, forceUnlock])

  // -- Load executive summary (once report loaded) --
  const loadExecSummary = useCallback(async () => {
    if (!id || execSummary || execLoading) return
    setExecLoading(true)
    try {
      const res = await fetch(`/api/report/${id}/executive-summary`)
      if (res.ok) {
        const { summary } = await res.json()
        setExecSummary(summary ?? null)
      }
    } catch { /* non-fatal */ }
    setExecLoading(false)
  }, [id, execSummary, execLoading])

  useEffect(() => {
    if (report) loadExecSummary()
  }, [report, loadExecSummary])

  // -- Load action plan (paid users only) --
  const loadActionPlan = useCallback(async () => {
    if (!id || actionPlan || planLoading) return
    setPlanLoading(true)
    try {
      const res = await fetch(`/api/report/${id}/action-plan`)
      if (res.ok) {
        const data = await res.json()
        setActionPlan(data)
      } else {
        setPlanError('Failed to load action plan')
      }
    } catch {
      setPlanError('Failed to load action plan')
    }
    setPlanLoading(false)
  }, [id, actionPlan, planLoading])

  useEffect(() => {
    if (!paid && !forceUnlock && !paidChecked) return
    if (!paid && !forceUnlock) return
    loadActionPlan()
  }, [paid, forceUnlock, paidChecked, loadActionPlan])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleDownloadPDF = () => { window.print() }

  const isPaid = paid || forceUnlock;

  if (loading) return <ReportSkeleton />

  if (error) {
    return (
      <div id="report-root" className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <p className="text-red-400 font-semibold">Failed to load report</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="text-teal-400 text-sm hover:underline">Try again</button>
        </div>
      </div>
    )
  }

  if (generating) {
    return <GeneratingState onPollComplete={(data) => { setReport(data); setGenerating(false) }} />
  }

  if (!report) {
    return (
      <div id="report-root" className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <p className="text-slate-400 mb-4">Report not found or still generating.</p>
          <button
            type="button"
            onClick={async () => {
              setGenerating(true)
              await fetch('/api/report/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: id }) })
            }}
            className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            Generate report
          </button>
        </div>
      </div>
    )
  }

  const tier = report.overall_score !== undefined ? getMaturityTier(report.overall_score) : null

  return (
    <div id="report-root" className="min-h-screen bg-[#0E1117] text-white">
      {/* Sticky nav */}
      <div className="sticky top-0 z-10 bg-[#0E1117]/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <a href="/dashboard" className="text-sm font-semibold text-white hover:text-teal-400 transition-colors">
          &larr; Dashboard
        </a>
        <div className="flex items-center gap-2">
          {/* Share button */}
          <div ref={shareRef} className="relative">
            <button
              type="button"
              aria-label="Share this report"
              aria-expanded={shareDropdown}
              aria-haspopup="true"
              onClick={() => setShareDropdown(p => !p)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0E1117]"
            >
              <Share2 size={13} /> Share
            </button>
            {shareDropdown && (
              <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <button type="button" onClick={handleCopyLink} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  {copied ? <><Check size={13} className="text-teal-400" /> Copied!</> : 'Copy link'}
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`We scored ${report.overall_score}/100 on digital maturity. See the full report:`)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Share on X
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Share on LinkedIn
                </a>
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="Download report as PDF"
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0E1117]"
          >
            <Download size={13} /> PDF
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Score card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Digital Maturity Score</p>
          <p className="text-6xl font-bold text-white">{report.overall_score ?? '—'}</p>
          {report.overall_score != null && (
            <p className={`text-base font-semibold ${getMaturityTier(report.overall_score).color}`}>
              {getMaturityTier(report.overall_score).label}
            </p>
          )}
          <p className="text-slate-500 text-xs">out of 100 &middot; based on interview responses</p>
        </div>

        {/* Executive summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-white">Executive Summary</h2>
          {execLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-slate-800 rounded w-full" />
              <div className="h-3 bg-slate-800 rounded w-5/6" />
              <div className="h-3 bg-slate-800 rounded w-4/5" />
            </div>
          ) : execSummary ? (
            <p className="text-slate-300 text-sm leading-relaxed">{execSummary}</p>
          ) : (
            <p className="text-slate-500 text-sm">Summary not available.</p>
          )}
        </div>

        {/* Dimensions */}
        {report.dimensions?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-semibold text-white">Dimension Scores</h2>
            <div className="space-y-4">
              {report.dimensions.map((dim) => {
                const benchmark = INDUSTRY_BENCHMARKS[dim.name?.toLowerCase()] ?? 55
                return (
                  <div key={dim.name} className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium text-slate-200 capitalize">{dim.name}</span>
                      <span className="text-sm font-bold text-white">{dim.score}</span>
                    </div>
                    <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${dim.score}%`,
                          background: dim.score >= 70 ? '#2dd4bf' : dim.score >= 50 ? '#38bdf8' : '#f59e0b',
                        }}
                      />
                      {/* Industry benchmark marker */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white/20"
                        style={{ left: `${benchmark}%` }}
                        title={`Industry avg: ${benchmark}`}
                      />
                    </div>
                    {dim.insight && (
                      <p className="text-xs text-slate-500 leading-relaxed">{dim.insight}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action Plan -- paid gate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">AI Action Plan</h2>
          {!isPaid ? (
            <div className="text-center py-6 space-y-4">
              <p className="text-slate-400 text-sm">Unlock your personalised AI Action Plan to see exactly what to fix, in which order, and why.</p>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lead_id: id }),
                  })
                  const data = await res.json()
                  if (data.url) window.location.href = data.url
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                Unlock for $49 &rarr;
              </button>
            </div>
          ) : planLoading ? (
            <div className="space-y-3 animate-pulse">
              {['quick_wins','six_month','long_term'].map(k => (
                <div key={k} className="space-y-2">
                  <div className="h-4 w-24 bg-slate-800 rounded" />
                  {[...Array(3)].map((_,i) => <div key={i} className="h-3 bg-slate-800 rounded" />)}
                </div>
              ))}
            </div>
          ) : planError ? (
            <p className="text-red-400 text-sm">{planError}</p>
          ) : actionPlan ? (
            <div className="space-y-6">
              {actionPlan.summary && (
                <div className="bg-teal-900/20 border border-teal-800/30 rounded-xl p-4">
                  <p className="text-sm text-teal-100 leading-relaxed">{actionPlan.summary}</p>
                </div>
              )}
              {(['quick_wins','six_month','long_term'] as const).map(cat => {
                const items = actionPlan[cat] ?? []
                const cfg = CATEGORY_CONFIG[cat]
                if (!items.length) return null
                return (
                  <div key={cat} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</h3>
                      <span className="text-xs text-slate-500">{cfg.desc}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-slate-800/50 rounded-xl">
                          <span className="text-slate-600 text-xs mt-0.5 font-mono">{i + 1}.</span>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-sm text-slate-200 leading-snug">{item.action}</p>
                            <div className="flex gap-2 flex-wrap">
                              <span className="text-xs text-slate-500">{item.dimension}</span>
                              <span className={`text-xs font-medium ${ item.impact === 'High' ? 'text-teal-400' : item.impact === 'Medium' ? 'text-sky-400' : 'text-slate-400' }`}>
                                {item.impact} impact
                              </span>
                              <span className={`text-xs ${ item.effort === 'Low' ? 'text-green-400' : item.effort === 'Medium' ? 'text-yellow-400' : 'text-orange-400' }`}>
                                {item.effort} effort
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Action plan not available.</p>
          )}
        </div>

        {/* Regenerate */}
        <div className="text-center">
          <button
            type="button"
            onClick={async () => {
              setGenerating(true)
              await fetch('/api/report/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: id, force: true }),
              })
            }}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 mx-auto transition-colors"
          >
            <RefreshCw size={11} /> Having issues? Try regenerating the report.
          </button>
        </div>

        <div className="no-print">
          <FeedbackBar />
        </div>
      </div>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportInner />
    </Suspense>
  )
}
