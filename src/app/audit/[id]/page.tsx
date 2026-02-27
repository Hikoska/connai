'use client'

import React from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Copy, Check, ExternalLink, RefreshCw, BarChart2,
  Users, Clock, CheckCircle2, FileText, Send
} from 'lucide-react'

type Interview = {
  id: string
  status: string
  stakeholder_name: string
  stakeholder_role: string
  stakeholder_email?: string
  token: string
  sent_at?: string
  link_opened_at?: string
  first_message_at?: string
  completed_at?: string
}

type Lead = {
  id: string
  org_name: string
  email: string
  captured_at: string
  status: string
  interviews: Interview[]
}

type Report = { lead_id: string; overall_score: number } | null

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    complete:    { label: 'Completed',  cls: 'bg-teal-500/15 text-teal-400 border-teal-500/20',    icon: <CheckCircle2 size={11} /> },
    started:     { label: 'Started',   cls: 'bg-blue-500/15 text-blue-300 border-blue-500/20',    icon: <Clock size={11} /> },
    in_progress: { label: 'In progress', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/20', icon: <Clock size={11} /> },
    opened:      { label: 'Link opened', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/20', icon: <ExternalLink size={11} /> },
    sent:        { label: 'Sent',       cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20', icon: <Send size={11} /> },
    pending:     { label: 'Pending',    cls: 'bg-white/8 text-white/40 border-white/10',           icon: <Clock size={11} /> },
    cancelled:   { label: 'Cancelled',  cls: 'bg-red-500/15 text-red-400 border-red-500/20',       icon: <Clock size={11} /> },
  }
  const { label, cls, icon } = cfg[status] ?? cfg.pending
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {icon} {label}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { }
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
    >
      {copied ? <><Check size={12} className="text-teal-400" /> Copied</> : <><Copy size={12} /> Copy link</>}
    </button>
  )
}

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [report, setReport] = useState<Report>(null)
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState<string | null>(null)
  const [resendDone, setResendDone] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth/login'); return }

    const { data, error } = await supabase
      .from('leads')
      .select(`
        id, org_name, email, captured_at, status,
        interviews ( id, status, stakeholder_name, stakeholder_role, stakeholder_email, token, sent_at, link_opened_at, first_message_at, completed_at )
      `)
      .eq('id', id)
      .single()

    if (!error && data) {
      setLead(data as Lead)
      // Check for report
      const { data: rep } = await supabase
        .from('reports')
        .select('lead_id, overall_score')
        .eq('lead_id', id)
        .maybeSingle()
      setReport(rep)
    }
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchData() }, [fetchData])

  const resendInvite = async (interview: Interview) => {
    setResending(interview.id)
    try {
      // Re-trigger the invite email by calling invites/generate with just this stakeholder
      await fetch('/api/invites/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: id,
          stakeholders: [{ name: interview.stakeholder_name, role: interview.stakeholder_role }],
        }),
      })
      setResendDone(interview.id)
      setTimeout(() => setResendDone(null), 3000)
    } catch { }
    setResending(null)
  }

  const generateReport = async () => {
    router.push(`/report/${id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#0E1117] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4">Audit not found.</p>
          <Link href="/dashboard" className="text-teal-400 hover:text-teal-300 text-sm">← Back to dashboard</Link>
        </div>
      </div>
    )
  }

  const completed = lead.interviews.filter(i => i.status === 'complete').length
  const total = lead.interviews.length
  const allDone = total > 0 && completed === total
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="min-h-screen bg-[#0E1117] text-white">
      <header className="border-b border-white/10 px-6 py-4 sticky top-0 bg-[#0E1117]/90 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-white/40 hover:text-white/70 text-xs transition-colors">← Dashboard</Link>
            <span className="text-white/20 hidden sm:inline">·</span>
            <span className="text-teal-400 font-semibold text-sm hidden sm:inline">{lead.org_name}</span>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <Link
                href={`/report/${lead.id}`}
                className="flex items-center gap-1.5 text-xs bg-teal-600/20 border border-teal-500/30 text-teal-400 hover:bg-teal-600/30 rounded-md px-3 py-1.5 transition-colors"
              >
                <BarChart2 size={13} /> View report
              </Link>
            )}
            {allDone && !report && (
              <button
                onClick={generateReport}
                className="flex items-center gap-1.5 text-xs bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-md px-3 py-1.5 transition-colors"
              >
                <FileText size={13} /> Generate report
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Overview */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{lead.org_name}</h1>
          <p className="text-white/40 text-sm">
            Started {new Date(lead.captured_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </p>

          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm text-white/50 shrink-0">
              <span className="text-white font-semibold">{completed}</span>/{total} interviews complete
            </span>
          </div>
        </div>

        {/* Stakeholder cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
            <Users size={13} /> Stakeholders
          </h2>

          {lead.interviews.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center text-white/40 text-sm">
              No stakeholders added yet.
            </div>
          ) : lead.interviews.map(iv => {
            const interviewUrl = `${baseUrl}/interview/${iv.token}`
            return (
              <div key={iv.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-white text-sm">{iv.stakeholder_name}</span>
                      <span className="text-white/30 text-xs">{iv.stakeholder_role}</span>
                    </div>
                    <StatusPill status={iv.status} />
                  </div>

                  {/* Actions */}
                  {iv.status !== 'complete' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => resendInvite(iv)}
                        disabled={resending === iv.id}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
                        title="Resend invite email"
                      >
                        {resending === iv.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : resendDone === iv.id ? (
                          <><Check size={12} className="text-teal-400" /> Sent</>
                        ) : (
                          <><Send size={12} /> Resend</>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Interview link */}
                {iv.status !== 'complete' && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                    <span className="text-xs text-white/20 truncate flex-1 font-mono">
                      {interviewUrl.replace('https://', '')}
                    </span>
                    <CopyButton text={interviewUrl} />
                    <a
                      href={interviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
                    >
                      <ExternalLink size={12} /> Open
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Score card when report exists */}
        {report && (
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-teal-400 font-medium uppercase tracking-wider mb-1">Report ready</p>
              <p className="text-white font-semibold">Score: {report.overall_score}/100</p>
            </div>
            <Link
              href={`/report/${lead.id}`}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <BarChart2 size={15} /> View full report
            </Link>
          </div>
        )}

        {/* CTA when all done but no report */}
        {allDone && !report && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">All interviews complete</p>
              <p className="text-white font-semibold">Ready to generate your Digital Maturity Report</p>
            </div>
            <button
              onClick={generateReport}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <FileText size={15} /> Generate report
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
