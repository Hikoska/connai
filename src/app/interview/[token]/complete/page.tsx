'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function InterviewCompletePage() {
  const params = useParams()
  const token = params?.token as string
  const [leadId, setLeadId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportStatus, setReportStatus] = useState<'warming' | 'ready' | 'failed'>('warming')

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

        // Pre-warm: kick off report generation in the background
        if (lid) {
          fetch('/api/report/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: lid }),
          })
            .then(r => setReportStatus(r.ok ? 'ready' : 'failed'))
            .catch(() => setReportStatus('failed'))
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

  const warmingDots = (
    <span className="inline-flex gap-0.5 ml-1 align-middle">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1 h-1 bg-teal-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )

  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          {orgName ? `Thank you!` : 'Interview complete!'}
        </h1>
        {orgName && (
          <p className="text-slate-500 text-sm mb-1">{orgName}</p>
        )}
        <p className="text-white/60 mb-2">
          Your responses have been recorded. Our AI is now analysing your digital maturity profile.
        </p>

        {/* Report status indicator */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 mb-8 inline-block text-sm">
          {reportStatus === 'warming' && (
            <span className="text-slate-400">
              Generating your report{warmingDots}
            </span>
          )}
          {reportStatus === 'ready' && (
            <span className="text-teal-400">
              <span className="mr-1.5">✓</span>Report generation started
            </span>
          )}
          {reportStatus === 'failed' && (
            <span className="text-slate-400">
              Your report will be ready in a few minutes
            </span>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          {leadId ? (
            <Link
              href={`/report/${leadId}`}
              className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              View my report →
            </Link>
          ) : null}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Go to dashboard
          </Link>
        </div>

        {/* Context note */}
        <p className="text-white/25 text-xs mt-8 leading-relaxed">
          Share your interview link with other stakeholders so they can contribute their perspective to the assessment.
        </p>
      </div>
    </div>
  )
}
