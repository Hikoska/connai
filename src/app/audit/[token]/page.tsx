'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Interview = {
  id: string
  stakeholder_name: string
  stakeholder_role: string
  stakeholder_email: string | null
  status: string
  interview_token: string
}

type Lead = {
  id: string
  org_name: string
  email: string
  status: string
  captured_at: string
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-xs text-teal-600 hover:underline">
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

export default function AuditPage() {
  const params = useParams()
  const token = params?.token as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) return
    const load = async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: leadData } = await supabase
        .from('leads')
        .select('id, org_name, email, status, captured_at')
        .eq('id', token)
        .single()

      if (!leadData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setLead(leadData)

      const { data: iData } = await supabase
        .from('interviews')
        .select('id, stakeholder_name, stakeholder_role, stakeholder_email, status, interview_token')
        .eq('lead_id', token)
        .order('created_at', { ascending: true })

      setInterviews(iData || [])
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>
  }

  if (notFound || !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Audit not found.</p>
          <Link href="/" className="text-teal-600 hover:underline">Back to home</Link>
        </div>
      </div>
    )
  }

  const total = interviews.length
  const done = interviews.filter(i => i.status === 'complete').length
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="min-h-screen bg-[#F8F6F2]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🧬</span>
            <span className="font-bold text-teal-600">Connai</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{lead.org_name}</h1>
          <p className="text-gray-500 mt-1">Digital Maturity Audit</p>
          <div className="mt-3">
            <span className={`inline-block text-sm font-medium px-3 py-1 rounded-full ${
              done === total && total > 0
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {total === 0
                ? 'Setting up'
                : done === total
                ? 'Complete'
                : `In progress — ${done} of ${total} interviews complete`}
            </span>
          </div>
        </div>

        {/* Interview tracker */}
        {total === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
            <p className="font-medium">No interviews scheduled yet.</p>
            <p className="text-sm mt-1">Complete the onboarding chat to generate interview links.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Stakeholder Interviews</h2>
              <p className="text-sm text-gray-500 mt-0.5">Share each link directly with the stakeholder.</p>
            </div>
            <div className="divide-y">
              {interviews.map((interview) => {
                const interviewUrl = `${origin}/interview/${interview.interview_token}`
                return (
                  <div key={interview.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{interview.stakeholder_name}</p>
                      <p className="text-sm text-gray-500">{interview.stakeholder_role}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        interview.status === 'complete'
                          ? 'bg-green-100 text-green-700'
                          : interview.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {interview.status === 'complete' ? 'Complete'
                          : interview.status === 'in_progress' ? 'In progress'
                          : 'Pending'}
                      </span>
                      <CopyButton url={interviewUrl} />
                      <Link
                        href={`/interview/${interview.interview_token}`}
                        className="text-sm text-gray-500 hover:text-teal-600"
                      >
                        Open →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Report preview banner */}
        {done > 0 && (
          <div className="mt-6 bg-teal-50 border border-teal-200 rounded-xl p-6">
            <h3 className="font-semibold text-teal-800 mb-1">
              {done < total ? 'Preview Available' : 'Report Ready'}
            </h3>
            <p className="text-sm text-teal-700">
              {done < total
                ? `Based on ${done} of ${total} completed interviews. Updates automatically as more complete.`
                : 'All interviews complete. Your full digital maturity report is ready.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
