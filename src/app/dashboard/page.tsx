'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, PlayCircle, Users, Plus, BarChart2, Link2, Check, Copy, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type User = { email: string }

type Interview = {
  id: string
  lead_id: string
  stakeholder_name: string
  stakeholder_role: string
  stakeholder_email: string | null
  token: string
  status: string
}

type Lead = {
  id: string
  org_name: string
  email: string
  status: string
  captured_at: string
  industry: string | null
  interviews: Interview[]
}

type Report = {
  lead_id: string
  overall_score: number
} | null

function StartInterviewButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <a href="/audit/new" className={className}>
      {children}
    </a>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user,    setUser]    = useState<{ email: string } | null>(null)
  const [leads,   setLeads]   = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [resendingId,   setResendingId]   = useState<string | null>(null)
  const [resendDoneId,  setResendDoneId]  = useState<string | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient(SB_URL, SB_ANON)
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace('/')
        return
      }
      setUser({ email: session.user.email ?? '' })

      const res = await fetch('/api/me/audits', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) { setLoading(false); return }

      const { leads: rawLeads, interviews, reports } = await res.json()

      // Join interviews + reports onto leads
      const enriched: Lead[] = rawLeads.map((l: any) => ({
        ...l,
        interviews: interviews.filter((iv: any) => iv.lead_id === l.id),
        report: reports.find((r: any) => r.lead_id === l.id) ?? null,
      }))
      setLeads(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const resendInvite = async (token: string) => {
    setResendingId(token)
    try {
      await fetch('/api/invites/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      setResendDoneId(token)
      setTimeout(() => setResendDoneId(null), 3000)
    } catch { /* ignore */ }
    setResendingId(null)
  }

  const regenerateReport = async (leadId: string) => {
    setRegeneratingId(leadId)
    try {
      await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      })
      // Navigate to report page after triggering regeneration
      router.push(`/report/${leadId}`)
    } catch { /* ignore */ }
    setRegeneratingId(null)
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'captured':             return { label: 'Draft',       color: 'bg-slate-500/15 text-slate-400' }
      case 'invites_sent':         return { label: 'Invited',     color: 'bg-blue-500/15 text-blue-400' }
      case 'interviews_in_progress': return { label: 'In Progress', color: 'bg-yellow-500/15 text-yellow-400' }
      case 'interviews_complete':  return { label: 'Complete',    color: 'bg-teal-500/15 text-teal-400' }
      default:                     return { label: status,        color: 'bg-slate-500/15 text-slate-400' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117] text-white">
        <header className="border-b border-white/5 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-5 w-24 bg-white/5 rounded animate-pulse" />
              <div className="h-8 w-28 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </div>
        </header>
        {/* Content skeleton */}
        <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-40 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
              <div className="flex gap-2 pt-1">
                <div className="h-7 w-24 bg-white/5 rounded-lg animate-pulse" />
                <div className="h-7 w-20 bg-white/5 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-white/60 text-sm">Sign in to view your dashboard.</p>
        <Link href="/" className="text-teal-400 hover:text-teal-300 text-sm underline underline-offset-4">Go to homepage</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E1117] text-white">
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-teal-400 font-bold text-lg tracking-tight">Connai</Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 hidden sm:block">{user.email}</span>
            <StartInterviewButton className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={13} /> New audit
            </StartInterviewButton>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {leads.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <FileText size={28} className="text-white/20" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No audits yet</h2>
            <p className="text-white/40 text-sm mb-6">Start your first digital maturity assessment.</p>
            <StartInterviewButton className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Plus size={15} /> Start free audit
            </StartInterviewButton>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-lg font-semibold text-white">Your Audits</h1>
              <span className="text-xs text-white/30">{leads.length} audit{leads.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-4">
              {leads.map(lead => {
                const { label, color } = statusLabel(lead.status)
                const isExpanded = expandedLead === lead.id
                const completedCount = lead.interviews.filter(iv => iv.status === 'complete').length
                const reportReady = lead.status === 'interviews_complete' || completedCount > 0

                return (
                  <div key={lead.id} className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h2 className="font-semibold text-white text-sm">{lead.org_name}</h2>
                          <p className="text-white/30 text-xs mt-0.5">
                            {lead.industry}
                            {lead.captured_at && (
                              <> &middot; Started {new Date(lead.captured_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                            )}
                          </p>
                        </div>
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {reportReady && (
                          <Link
                            href={`/report/${lead.id}`}
                            className="flex items-center gap-1.5 text-xs font-medium text-teal-400 hover:text-teal-300 bg-teal-950/40 hover:bg-teal-950/60 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <BarChart2 size={13} /> View Report
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Users size={13} />
                          {lead.interviews.length} stakeholder{lead.interviews.length !== 1 ? 's' : ''}
                          {completedCount > 0 && <span className="text-teal-400">({completedCount} done)</span>}
                        </button>
                        {reportReady && (
                          <button
                            type="button"
                            onClick={() => regenerateReport(lead.id)}
                            disabled={regeneratingId === lead.id}
                            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {regeneratingId === lead.id ? 'Regenerating…' : 'Regenerate'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && lead.interviews.length > 0 && (
                      <div className="border-t border-white/5 px-5 py-4 space-y-3">
                        {lead.interviews.map(iv => (
                          <div key={iv.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-white truncate">{iv.stakeholder_name}</p>
                              <p className="text-xs text-white/30 truncate">{iv.stakeholder_role}{iv.stakeholder_email && <> &middot; {iv.stakeholder_email}</>}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                iv.status === 'complete'    ? 'bg-teal-500/15 text-teal-400' :
                                iv.status === 'in_progress' ? 'bg-yellow-500/15 text-yellow-400' :
                                iv.status === 'opened'     ? 'bg-blue-500/15 text-blue-400' :
                                iv.status === 'sent'       ? 'bg-slate-500/15 text-slate-400' :
                                'bg-slate-500/15 text-slate-500'
                              }`}>{iv.status}</span>
                              {iv.status !== 'complete' && (
                                <button
                                  type="button"
                                  disabled={resendingId === iv.token}
                                  onClick={() => resendInvite(iv.token)}
                                  className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-colors disabled:opacity-40"
                                >
                                  {resendDoneId === iv.token ? (
                                    <><Check size={11} className="text-teal-400" /> Sent</>
                                  ) : resendingId === iv.token ? (
                                    'Sending…'
                                  ) : (
                                    <><PlayCircle size={11} /> Resend</>
                                  )}
                                </button>
                              )}
                              {iv.status !== 'complete' && (
                                <a
                                  href={`/interview/${iv.token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-colors"
                                >
                                  <Link2 size={11} /> Link
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
