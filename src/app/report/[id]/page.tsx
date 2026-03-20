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
            <div className="h-3 w-3/4 bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </main>
    </div>
  )
}

function noCacheJson(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    },
  })
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
      <div className="text-slate-600 text-xs">Page will update automatically</div>
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

  // ── Close share dropdown on outside click ──
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

  // ── Load report ──
  useEffect(() => {
    if (!id) return
    const loadReport = async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('id, overall_score, dimensions, executive_summary')
          .eq('lead_id', id)
          .maybeSingle()
        if (error) throw error
        if (!data) {
          // No report yet — check if interviews are complete so we can trigger generation
          setGenerating(true)
        } else {
          setReport(data as ReportData)
        }
      } catch (e) {
        setError((e as Error).message || 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    loadReport()
  }, [id])

  // ── Check paid status ──
  useEffect(() => {
    if (!id || forceUnlock) { setPaidChecked(true); return }
    fetch(`/api/report/${id}/paid-status`)
      .then(r => r.json())
      .then(({ paid: p }) => { setPaid(!!p); setPaidChecked(true) })
      .catch(() => setPaidChecked(true))
  }, [id, forceUnlock])

  // ── Load executive summary (once report + paid resolved) ──
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

  // ── Load action plan (paid users only) ──
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
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setShareDropdown(false)
  }

  const handleDownloadPDF = () => {
    window.print()
  }

  if (loading) return <ReportSkeleton />

  if (generating) {
    return <GeneratingState onPollComplete={(data) => { setReport(data); setGenerating(false) }} />
  }

  if (error) {
    return (
      <div id="report-root" className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <p className="text-red-400">{error}</p>
          <a href="/dashboard" className="text-teal-400 underline text-sm">Back to dashboard</a>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div id="report-root" className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
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
          <span className="text-white/60 text-sm font-medium">Digital Maturity Report</span>
          <div className="flex items-center gap-2">
            {/* Share button */}
            <div className="relative" ref={shareRef}>
              <button
                type="button"
                onClick={() => setShareDropdown(v => !v)}
                aria-label="Share this report"
                aria-expanded={shareDropdown}
                aria-haspopup="true"
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Share2 size={13} /> Share
              </button>
              {shareDropdown && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-teal-400" /> : <Share2 size={14} />}
                    {copied ? 'Link copied!' : 'Copy link'}
                  </button>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Just completed my Digital Maturity Assessment with Connai 🚀')}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    Share on X (Twitter)
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    Share on LinkedIn
                  </a>
                </div>
              )}
            </div>
            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              aria-label="Download report as PDF"
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={13} /> PDF
            </button>
          </div>
        </div>
      </div>

      <main id="main-report" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Score card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
          <p className="text-slate-400 text-sm">Overall Digital Maturity Score</p>
          <p className="text-6xl font-bold text-white">{report.overall_score ?? '—'}</p>
          {report.overall_score != null && (
            <p className={`text-base font-semibold ${getMaturityTier(report.overall_score).color}`}>
              {getMaturityTier(report.overall_score).label}
            </p>
          )}
        </div>

        {/* Executive Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-white">Executive Summary</h2>
          {execLoading ? (
            <div className="space-y-2">
              <div className="h-3 bg-slate-800 rounded animate-pulse w-full" />
              <div className="h-3 bg-slate-800 rounded animate-pulse w-5/6" />
              <div className="h-3 bg-slate-800 rounded animate-pulse w-4/6" />
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

        {/* Action Plan — paid gate */}
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
                    body: JSON.stringify({ reportId: id }),
                  })
                  const { url, error } = await res.json()
                  if (url) window.location.href = url
                  else alert(error || 'Something went wrong')
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                Unlock Action Plan — $49
              </button>
            </div>
          ) : planLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-3 bg-slate-800 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
              ))}
            </div>
          ) : planError ? (
            <div className="space-y-2">
              <p className="text-red-400 text-sm">{planError}</p>
              <button
                type="button"
                onClick={() => { setPlanError(null); loadActionPlan() }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          ) : actionPlan ? (
            <div className="space-y-5">
              {actionPlan.summary && (
                <div className="bg-teal-950/40 border border-teal-800/40 rounded-xl p-4">
                  <p className="text-sm text-teal-200 leading-relaxed">{actionPlan.summary}</p>
                </div>
              )}
              {(['quick_wins', 'six_month', 'long_term'] as const).map(tier => (
                actionPlan[tier]?.length > 0 && (
                  <div key={tier} className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <h3 className={`text-sm font-semibold ${TIER_META[tier].color}`}>{TIER_META[tier].label}</h3>
                      <span className="text-xs text-slate-500">{TIER_META[tier].desc}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {actionPlan[tier].map((item: string, i: number) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-300">
                          <span className="text-slate-600 shrink-0">{i + 1}.</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Action plan not available. Try
              <button
                type="button"
                onClick={loadActionPlan}
                className="ml-1 text-teal-400 underline"
              >regenerating the report.</button>
            </p>
          )}
        </div>

        <div className="no-print">
          <FeedbackBar reportId={id ?? ''} />
        </div>
      </main>
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
