'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ReportCTA from './ReportCTA'

export const dynamic = 'force-dynamic'

export default function InterviewCompletePage() {
  const params = useParams()
  const token = params?.token as string
  const [leadId, setLeadId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLead = async () => {
      if (!token) { setLoading(false); return }
      const supabase = createClient()
      const { data: interview } = await supabase
        .from('interviews')
        .select('lead_id, leads(org_name)')
        .eq('token', token)
        .single()
      if (interview) {
        const lid = interview.lead_id
        setLeadId(lid)
        const leads = interview.leads as Record<string, unknown>
        setOrgName(
          Array.isArray(leads)
            ? (leads[0] as Record<string, string>)?.org_name
            : (leads as Record<string, string>)?.org_name
        )

        // Kick off report generation in the background (fire-and-forget)
        if (lid) {
          fetch('/api/report/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: lid }),
          }).catch(() => {})
        }
      }
      setLoading(false)
    }
    fetchLead()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Interview complete!
        </h1>
        {orgName && (
          <p className="text-slate-400 text-sm mb-1">{orgName}</p>
        )}
        <p className="text-white/60 mb-6 text-sm leading-relaxed">
          Your responses have been recorded. Our AI is now analysing your digital maturity profile.
        </p>

        {/* Report CTA — polls until report is ready, then shows link */}
        {leadId ? (
          <ReportCTA leadId={leadId} />
        ) : (
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Go to dashboard
          </Link>
        )}

        {/* Context note */}
        <p className="text-white/25 text-xs mt-8 leading-relaxed">
          Share your interview link with other stakeholders so they can contribute their perspective to the assessment.
        </p>
      </div>
    </div>
  )
}
