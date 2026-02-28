'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ReportCTA from './ReportCTA'

export default function InterviewCompletePage() {
  const params = useParams()
  const token = params?.token as string
  const [leadId, setLeadId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLead = async () => {
      if (!token) {
        setLoading(false)
        return
      }
      const supabase = createClient()
      const { data: interview } = await supabase
        .from('interviews')
        .select('lead_id, leads(org_name)')
        .eq('interview_token', token)
        .single()
      if (interview) {
        setLeadId(interview.lead_id)
        const leads = interview.leads as any
        setOrgName(Array.isArray(leads) ? leads[0]?.org_name : leads?.org_name)
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
        <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Thank you!
        </h1>
        <p className="text-white/60 mb-4">
          {orgName ? `Your interview for ${orgName} is complete.` : 'Your interview is complete.'}
        </p>

        {leadId && <ReportCTA leadId={leadId} />}
      </div>
    </div>
  )
}
