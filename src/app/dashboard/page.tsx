'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { FileText, PlayCircle, Users, Plus, BarChart2, Link2, Check, Loader2, RefreshCw, Mail } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StartInterviewButton } from '@/components/StartInterviewButton'
import { PricingModal } from '@/components/PricingModal'

type Interview = {
  id: string
  lead_id: string
  stakeholder_name: string
  stakeholder_role: string
  stakeholder_email?: string
  token: string
  status: string // 'pending' | 'started' | 'complete'
}

function ivStatusLabel(status: string): { label: string; dot: string } {
  if (status === 'complete') return { label: 'Completed', dot: 'bg-teal-400' }
  if (status === 'started')  return { label: 'In Progress', dot: 'bg-yellow-400' }
  return { label: 'Pending', dot: 'bg-white/20' }
}

type Lead = {
  id: string
  org_name: string
  owner_email: string
  captured_at: string
  interviews: Interview[]
  report: { id: string; lead_id: string } | null
}

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function DashboardPage() {
  const [user, setUser]   = useState<{ email: string } | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [resendingInvite, setResendingInvite] = useState<string | null>(null)
  const supabaseRef = useRef<SupabaseClient | null>(null)

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/interview/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    }).catch(() => {})
  }

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@supabase/supabase-js')
      if (!supabaseRef.current) {
        supabaseRef.current = createClient(SB_URL, SB_ANON)
      }
      const supabase = supabaseRef.current

      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user as { email: string })

        // Use server-side API route to bypass RLS — service role reads all leads by email
        const apiRes = await fetch('/api/me/audits', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (!apiRes.ok) {
          setLoading(false)
          return
        }

        const { leads: leadsData, interviews: rawInterviews, reports } = await apiRes.json()

        const interviews: Interview[] = (rawInterviews || []).map((session: any) => ({
          id: session.id,
          lead_id: session.company_id || session.lead_id,
          stakeholder_name: session.stakeholder_name || session.stakeholder_email || '',
          stakeholder_role: session.role || session.stakeholder_role || 'Stakeholder',
          stakeholder_email: session.stakeholder_email || undefined,
          token: session.token,
          status: session.status || 'pending',
        }))

        const merged: Lead[] = (leadsData || []).map((lead: any) => ({
          ...lead,
          interviews: interviews.filter((i) => i.lead_id === lead.id),
          report: (reports || []).find((r: any) => r.lead_id === lead.id) ?? null,
        }))

        setLeads(merged)
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    init()

  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
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
    <div className="min-h-screen bg-[#0E1117]">
      {/* Header */}
      <header className="bg-[#0E1117]/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">C</span>
          </div>
          <span className="text-sm font-semibold text-slate-200">Connai</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 hidden sm:block">{user.email}</span>
          <StartInterviewButton className="flex items-center gap-1.5 text-xs bg-teal-600 hover:bg-teal-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={13} /> New audit
          </StartInterviewButton>
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
              <h1 className="text-lg font-bold text-white">Your Audits</h1>
              <span className="text-xs text-white/30">{leads.length} audit{leads.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-3">
              {leads.map(lead => {
                const allDone = lead.interviews.length > 0 && lead.interviews.every(i => i.status === 'complete')
                const completedCount = lead.interviews.filter(i => i.status === 'complete').length
                const totalCount = lead.interviews.length

                return (
                  <div key={lead.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Org icon */}
                      <div className="w-10 h-10 bg-teal-900/40 border border-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users size={18} className="text-teal-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Org name + date + progress */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex flex-col min-w-0">
                            <h2 className="font-semibold text-white truncate">{lead.org_name || 'Unnamed Organisation'}</h2>
                            {lead.captured_at && (
                              <span className="text-xs text-white/30 mt-0.5">
                                {new Date(lead.captured_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                          {totalCount > 0 && (
                            <span className="text-xs text-white/40 shrink-0">
                              {completedCount}/{totalCount} completed
                            </span>
                          )}
                        </div>

                        {/* Per-stakeholder status */}
                        {lead.interviews.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1.5">
                            {lead.interviews.map(iv => {
                              const s = ivStatusLabel(iv.status)
                              return (
                                <div key={iv.id} className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                                  <span className="text-xs text-white/60 truncate max-w-[140px]">
                                    {iv.stakeholder_name}
                                  </span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    iv.status === 'complete'
                                      ? 'bg-teal-500/10 text-teal-400'
                                      : iv.status === 'started'
                                      ? 'bg-yellow-500/10 text-yellow-400'
                                      : 'bg-white/5 text-white/30'
                                  }`}>
                                    {s.label}
                                  </span>
                                  {iv.status !== 'complete' && (
                                    <button
                                      type="button"
                                      title="Copy invite link"
                                      onClick={() => copyInviteLink(iv.token)}
                                      className="ml-1 p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
                                    >
                                      {copiedToken === iv.token
                                        ? <Check size={11} className="text-teal-400" />
                                        : <Link2 size={11} />
                                      }
                                    </button>
                                  )}
                                  {iv.status !== 'complete' && iv.stakeholder_email && (
                                    <button
                                      type="button"
                                      title="Resend invite email"
                                      disabled={resendingInvite === iv.token}
                                      onClick={async () => {
                                        setResendingInvite(iv.token)
                                        try {
                                          await fetch('/api/invites/resend', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ token: iv.token }),
                                          })
                                        } catch { /* silent */ }
                                        setTimeout(() => setResendingInvite(null), 2000)
                                      }}
                                      className="ml-0.5 p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 disabled:opacity-50 transition-colors"
                                    >
                                      {resendingInvite === iv.token
                                        ? <Check size={11} className="text-teal-400" />
                                        : <Mail size={11} />
                                      }
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {lead.report && (
                            <Link
                              href={`/report/${lead.id}`}
                              className="flex items-center gap-1.5 text-sm bg-teal-600/20 border border-teal-500/30 text-teal-400 hover:bg-teal-600/30 rounded-md px-3 py-1.5 transition-colors"
                            >
                              <BarChart2 size={14} /> Report
                            </Link>
                          )}
                          {lead.report && allDone && (
                            <button
                              type="button"
                              disabled={generatingReport === lead.id}
                              title="Regenerate report"
                              onClick={async () => {
                                if (!confirm('Regenerate the report? This will overwrite the existing one.')) return
                                setGeneratingReport(lead.id)
                                try {
                                  const r = await fetch('/api/report/generate', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ lead_id: lead.id }),
                                  })
                                  if (r.ok) window.location.reload()
                                } catch { /* silent */ }
                                setGeneratingReport(null)
                              }}
                              className="flex items-center gap-1.5 text-sm bg-white/5 border border-white/20 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-40 rounded-md px-2 py-1.5 transition-colors"
                            >
                              {generatingReport === lead.id
                                ? <Loader2 size={12} className="animate-spin" />
                                : <RefreshCw size={12} />
                              }
                            </button>
                          )}
                          {allDone && !lead.report && (
                            <button
                              type="button"
                              disabled={generatingReport === lead.id}
                              onClick={async () => {
                                setGeneratingReport(lead.id)
                                try {
                                  const r = await fetch('/api/report/generate', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ lead_id: lead.id }),
                                  })
                                  if (r.ok) window.location.reload()
                                } catch { /* silent */ }
                                setGeneratingReport(null)
                              }}
                              className="flex items-center gap-1.5 text-sm bg-teal-600 hover:bg-teal-500 border border-teal-500 text-white disabled:opacity-50 rounded-md px-3 py-1.5 transition-colors"
                            >
                              {generatingReport === lead.id
                                ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                                : <><BarChart2 size={14} /> Generate Report</>
                              }
                            </button>
                          )}
                          <Link
                            href={`/audit/${lead.id}`}
                            className="flex items-center gap-1.5 text-sm bg-white/10 border border-white/20 rounded-md px-3 py-1.5 hover:bg-white/20 text-white transition-colors"
                          >
                            <PlayCircle size={14} />
                            {allDone ? 'View' : 'Manage'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </div>
  )
}
