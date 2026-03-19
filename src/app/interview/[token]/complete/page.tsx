'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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
        setLeadId(interview.lead_id)
        const leads = interview.leads as Record<string, unknown>
        setOrgName(Array.isArray(leads) ? (leads[0] as Record<string,string>)?.org_name : (leads as Record<string,string>)?.org_name)
      }
      setLoading(false)
    }
    fetchLead()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          {orgName ? `Thank you, ${orgName}!` : 'Interview complete!'}
        </h1>
        <p className="text-white/60 mb-2">
          Your responses have been recorded. Our AI is now analysing your digital maturity profile.
        </p>
        <p className="text-white/40 text-sm mb-8">
          Your report will be ready in a few minutes.
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col gap-3">
          {leadId ? (
            <Link
              href={`/report/${leadId}`}
              className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
            >
              View my report →
            </Link>
          ) : null}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Go to dashboard
          </Link>
        </div>

        {/* Context note */}
        <p className="text-white/30 text-xs mt-6">
          Share this link with your team so others can contribute their perspective.
        </p>
      </div>
    </div>
  )
}
