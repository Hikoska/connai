'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { FileText, PlayCircle, Users, Plus, BarChart2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StartInterviewButton } from '@/components/StartInterviewButton'
import { PricingModal } from '@/components/PricingModal'

type Interview = {
  id: string
  lead_id: string
  stakeholder_name: string
  stakeholder_role: string
  interview_token: string
  status: string // 'pending' | 'started' | 'complete'
}

function ivStatusLabel(status: string): { label: string; dot: string } {
  if (status === 'complete') return { label: 'Completed', dot: 'bg-teal-400' }
  if (status === 'started')  return { label: 'In progress', dot: 'bg-yellow-400' }
  return { label: 'Sent', dot: 'bg-white/30' }
}

type Report = {
  lead_id: string
  overall_score: number
}

type Lead = {
  id: string
  org_name: string
  email: string
  status: string
  captured_at: string
  interviews: Interview[]
  report?: Report | null
}

function scoreTier(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Digital Leader', color: 'text-teal-400' }
  if (score >= 60) return { label: 'Digitally Advanced', color: 'text-blue-400' }
  if (score >= 40) return { label: 'Digitally Active', color: 'text-yellow-400' }
  if (score >= 20) return { label: 'Digitally Emerging', color: 'text-orange-400' }
  return { label: 'Digitally Dormant', color: 'text-red-400' }
}

const statusColors: { [key: string]: string } = {
  captured: 'bg-blue-500/20 text-blue-300',
  interviewed: 'bg-yellow-500/20 text-yellow-300',
  reported: 'bg-green-500/20 text-green-300',
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@supabase/supabase-js')
      if (!supabaseRef.current) {
        supabaseRef.current = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
      }
      const supabase = supabaseRef.current

      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)
        const userEmail = session.user.email?.toLowerCase()

        const { data: leadsData, error: leadsError } = await supabase
          .from('leads')
          .select('id, org_name, email, status, captured_at')
          .eq('email', userEmail)
          .order('captured_at', { ascending: false })

        if (leadsError) {
          console.error('Error fetching leads:', leadsError)
          setLoading(false)
          return
        }

        const leadIds = (leadsData || []).map((l: any) => l.id)
        let interviews: Interview[] = []
        let reports: Report[] = []

        if (leadIds.length > 0) {
          const [intRes, repRes] = await Promise.all([
            supabase
              .from('interviews')
              .select('id, lead_id, stakeholder_name, stakeholder_role, interview_token, status')
              .in('lead_id', leadIds),
            supabase
              .from('reports')
              .select('lead_id, overall_score')
              .in('lead_id', leadIds),
          ])
          interviews = intRes.data || []
          reports = repRes.data || []
        }

        const merged: Lead[] = (leadsData || []).map((lead: any) => ({
          ...lead,
          interviews: interviews.filter((i) => i.lead_id === lead.id),
          report: reports.find((r) => r.lead_id === lead.id) ?? null,
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
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E1117] p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-2">Your audits</h1>
          <p className="mb-6 text-white/60">Log in to view your audit dashboard.</p>
          <Link
            href="/auth/login"
            className="bg-teal-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-teal-500 transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E1117]">
      <main className="p-4 sm:p-8 max-w-5xl mx-auto pt-24">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Your Audits</h1>
            <p className="text-sm text-white/40">{user.email}</p>
          </div>
          <Link
            href="/audit/new"
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors shrink-0"
          >
            <Plus size={16} /> New Audit
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg">
          <div className="divide-y divide-white/10">
            {leads.length > 0 ? leads.map(lead => {
              const completed = lead.interviews.filter(i => i.status === 'complete').length
              const total = lead.interviews.length
              const allDone = total > 0 && completed === total
              const tier = lead.report ? scoreTier(lead.report.overall_score) : null

              return (
                <div key={lead.id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: org info */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="text-white/30" size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-white truncate">{lead.org_name}</h2>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[lead.status] || 'bg-white/10 text-white/80'}`}>
                            {lead.status}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">
                          {new Date(lead.captured_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </p>

                        {/* Stakeholder progress */}
                        {total > 0 && (
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Users size={12} className="text-white/30" />
                              <span className="text-xs text-white/40">
                                {completed}/{total} interviews complete
                              </span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-500 rounded-full transition-all"
                                style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        )}

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
                                  <span className={`text-xs ml-auto px-1.5 py-0.5 rounded-full ${
                                    iv.status === 'complete' ? 'bg-teal-500/10 text-teal-400'
                                    : iv.status === 'started' ? 'bg-yellow-500/10 text-yellow-400'
                                    : 'bg-white/5 text-white/30'
                                  }`}>
                                    {s.label}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {/* Free-tier teaser */}
                        {completed >= 1 && (
                          <button
                            onClick={() => setIsPricingModalOpen(true)}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 px-2.5 py-1 rounded-full transition-colors"
                          >
                            Free interview used — add more from $99
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right: score + actions */}
                    <div className="flex items-center gap-3 shrink-0 pl-[52px] sm:pl-0">
                      {/* Score badge */}
                      {lead.report && tier && (
                        <div className="text-right hidden sm:block">
                          <div className="text-xl font-bold text-white">{lead.report.overall_score}<span className="text-sm text-white/40">/100</span></div>
                          <div className={`text-xs font-medium ${tier.color}`}>{tier.label}</div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {lead.report && (
                          <Link
                            href={`/report/${lead.id}`}
                            className="flex items-center gap-1.5 text-sm bg-teal-600/20 border border-teal-500/30 text-teal-400 hover:bg-teal-600/30 rounded-md px-3 py-1.5 transition-colors"
                          >
                            <BarChart2 size={14} /> Report
                          </Link>
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
            }) : (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-white/20" size={22} />
                </div>
                <p className="text-white/50 mb-4">No audits yet.</p>
                <Link
                  href="/audit/new"
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  <Plus size={15} /> Start your first audit
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </div>
  )
}
