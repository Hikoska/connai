'use client'
import { Share2, Check, Download, RefreshCw } from 'lucide-react';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'
import { FeedbackBar } from '@/components/FeedbackBar';

export const dynamic = 'force-dynamic'


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
      <div className="h-32 bg-slate-800 rounded-2xl" />
      <div className="h-4 w-full bg-slate-800 rounded" />
      <div className="h-4 w-3/4 bg-slate-800 rounded" />
      <div className="h-48 bg-slate-800 rounded-2xl" />
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
      title="Copy link"
    >
      {copied ? <Check size={12} className="text-teal-400" /> : <Share2 size={12} />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

function useReportId() {
  const params = useParams()
  return params?.id as string | undefined
}

function ReportPageInner() {
  const id = useReportId()
  const searchParams = useSearchParams()
  const forceUnlock = searchParams.get('force') === '1'

  const supabase = createClient()

  const [report,       setReport]       = useState<ReportData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [generating,   setGenerating]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [execSummary,  setExecSummary]  = useState<string | null>(null)
  const [execLoading,  setExecLoading]  = useState(false)
  const [actionPlan,   setActionPlan]   = useState<ActionPlan | null>(null)
  const [planLoading,  setPlanLoading]  = useState(false)
  const [planError,    setPlanError]    = useState<string | null>(null)
  const [paid,         setPaid]         = useState(false)
  const [paidChecked,  setPaidChecked]  = useState(false)
  const [shareMsg,     setShareMsg]     = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount = useRef(0)

  // -- Load report from DB --
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
          const reportData = data as ReportData
          setReport({ ...reportData, dimensions: dims })
          // Pre-populate exec summary from DB field to skip redundant API call
          if (reportData.executive_summary) {
            setExecSummary(reportData.executive_summary)
          }
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

  // -- Load executive summary (once report loaded, fallback if not in DB) --
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
    } catch { setPlanError('Network error') }
    setPlanLoading(false)
  }, [id, actionPlan, planLoading])

  useEffect(() => {
    if (!paid && !forceUnlock && !paidChecked) return
    if (!paid && !forceUnlock) return
  }, [paid, forceUnlock, paidChecked, loadActionPlan])

  const isPaid = paid || forceUnlock;

  // Poll for report when generating
  useEffect(() => {
    if (!generating || !id) return
    const triggerGenerate = async () => {
      try {
        await fetch('/api/report/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: id }),
        })
      } catch { /* fire-and-forget */ }
    }
    triggerGenerate()
    pollRef.current = setInterval(async () => {
      pollCount.current += 1
      if (pollCount.current > POLL_MAX_ATTEMPTS) {
        clearInterval(pollRef.current!)
        setGenerating(false)
        setError('Report generation timed out. Please refresh to try again.')
        return
      }
      const { data } = await supabase
        .from('reports')
        .select('id, overall_score, dimension_scores, executive_summary')
        .eq('lead_id', id)
        .maybeSingle()
      if (data?.overall_score) {
        clearInterval(pollRef.current!)
        setGenerating(false)
        const rawDims = (data as ReportData & { dimension_scores?: Record<string, number> }).dimension_scores ?? {}
        const dims: Dimension[] = Object.entries(rawDims).map(([name, score]) => ({ name, score: score as number }))
        const reportData = data as ReportData
        setReport({ ...reportData, dimensions: dims })
        if (reportData.executive_summary) setExecSummary(reportData.executive_summary)
      }
    }, POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [generating, id])

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied!')
    } catch {
      setShareMsg(url)
    }
    setTimeout(() => setShareMsg(null), 3000)
  }

  if (loading) return <ReportSkeleton />

  if (error) {
    return (
      <div id="report-root" className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-red-400 font-semibold mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-teal-400 underline text-sm">Refresh</button>
        </div>
      </div>
    )
  }

  if (generating) {
    return (
      <div id="report-root" className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4 gap-6">
        <div className="w-10 h-10 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-white font-semibold mb-1">Building your report…</p>
          <p className="text-slate-400 text-sm">This usually takes 30–60 seconds</p>
        </div>
      </div>
    )
  }

  if (!report) return <ReportSkeleton />

  const score = report.overall_score ?? 0
  const tier = getMaturityTier(score)
  const dimensions = report.dimensions ?? []

  return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white">
      {/* Header bar */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <span className="text-teal-400 font-bold text-sm">Connai</span>
        <div className="flex items-center gap-2">
          <CopyButton text={typeof window !== 'undefined' ? window.location.href : ''} />
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
          >
            <Share2 size={12} />
            Share
          </button>
        </div>
      </div>
      {shareMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50 max-w-xs text-center">
          {shareMsg}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Score card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-white/10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Digital Maturity Score</p>
              <div className="flex items-end gap-2">
                <span className="text-6xl font-bold font-mono">{score}</span>
                <span className="text-slate-500 text-xl mb-1">/100</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-semibold ${tier.color}`}>{tier.label}</span>
              <div className="mt-1">
                <button
                  onClick={() => fetch('/api/report/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: id }) }).then(() => window.location.reload())}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                  title="Regenerate report"
                >
                  <RefreshCw size={11} />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all duration-1000"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Executive Summary */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-white/5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Executive Summary</h2>
          {execLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-slate-800 rounded w-full" />
              <div className="h-3 bg-slate-800 rounded w-5/6" />
              <div className="h-3 bg-slate-800 rounded w-4/5" />
            </div>
          ) : execSummary ? (
            <p className="text-slate-300 text-sm leading-relaxed">{execSummary}</p>
          ) : (
            <p className="text-slate-500 text-sm italic">Summary not available.</p>
          )}
        </div>

        {/* Dimension scores */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-white/5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Dimension Scores</h2>
          <div className="space-y-4">
            {dimensions.map(dim => {
              const benchmarkKey = dim.name.toLowerCase()
              const benchmark = INDUSTRY_BENCHMARKS[benchmarkKey]
              return (
                <div key={dim.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{dim.name}</span>
                    <div className="flex items-center gap-2">
                      {benchmark !== undefined && (
                        <span className="text-slate-600 text-xs">avg {benchmark}</span>
                      )}
                      <span className="font-mono font-bold">{Math.round(dim.score)}</span>
                    </div>
                  </div>
                  <div className="relative h-1.5 bg-slate-700 rounded-full overflow-visible">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-700"
                      style={{ width: `${dim.score}%` }}
                    />
                    {benchmark !== undefined && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-slate-400 rounded-full"
                        style={{ left: `${benchmark}%` }}
                        title={`Industry avg: ${benchmark}`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Plan (paid) */}
        {isPaid ? (
          <div className="bg-slate-900 rounded-2xl p-5 border border-white/5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Action Plan</h2>
            {planLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-800 rounded-xl" />)}
              </div>
            ) : planError ? (
              <p className="text-red-400 text-sm">{planError}</p>
            ) : actionPlan ? (
              <div className="space-y-6">
                {(Object.entries(CATEGORY_CONFIG) as [keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([cat, cfg]) => {
                  const items: ActionItem[] = actionPlan[cat as keyof ActionPlan] as ActionItem[] ?? []
                  if (!items.length) return null
                  return (
                    <div key={cat}>
                      <div className="flex items-baseline gap-2 mb-3">
                        <h3 className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</h3>
                        <span className="text-slate-500 text-xs">{cfg.desc}</span>
                      </div>
                      <div className="space-y-2">
                        {items.map((item: ActionItem, i: number) => (
                          <div key={i} className="bg-slate-800 rounded-xl p-4">
                            <p className="text-slate-200 text-sm mb-2">{item.action}</p>
                            <div className="flex gap-3 text-xs">
                              <span className="text-slate-500">Dimension: <span className="text-slate-400">{item.dimension}</span></span>
                              <span className="text-slate-500">Impact: <span className={item.impact === 'High' ? 'text-teal-400' : 'text-slate-400'}>{item.impact}</span></span>
                              <span className="text-slate-500">Effort: <span className="text-slate-400">{item.effort}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {actionPlan.summary && (
                  <p className="text-slate-500 text-xs border-t border-white/5 pt-4">{actionPlan.summary}</p>
                )}
              </div>
            ) : (
              <button
                onClick={loadActionPlan}
                className="w-full py-3 bg-teal-600/20 text-teal-400 rounded-xl text-sm font-medium hover:bg-teal-600/30 transition-colors"
              >
                Load action plan
              </button>
            )}
          </div>
        ) : paidChecked ? (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-teal-500/20 text-center">
            <p className="text-white font-semibold mb-2">Unlock your full action plan</p>
            <p className="text-slate-400 text-sm mb-4">Quick wins, a 6-month roadmap, and long-term transformation steps.</p>
            <a
              href={`/checkout?lead_id=${id}`}
              className="inline-block bg-teal-600 hover:bg-teal-500 text-white font-bold px-6 py-3 rounded-full text-sm transition-colors"
            >
              Get full report &rarr;
            </a>
          </div>
        ) : null}

        {/* Regenerate (force) */}
        <div className="bg-slate-900/50 rounded-2xl p-5 border border-white/5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Report Controls</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                await fetch('/api/report/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ lead_id: id, force: true }),
                })
                window.location.reload()
              }}
              className="flex items-center gap-2 text-xs bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
            >
              <RefreshCw size={12} />
              Force regenerate
            </button>
            <a
              href={`/api/report/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
            >
              <Download size={12} />
              Download PDF
            </a>
          </div>
        </div>

        {/* Feedback */}
        <FeedbackBar reportId={report.id ?? id ?? ''} />
      </div>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportPageInner />
    </Suspense>
  )
}
