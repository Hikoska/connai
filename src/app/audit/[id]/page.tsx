'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Interview = {
  id: string
  status: string
  stakeholder_name: string
  stakeholder_role: string
  transcript: { content: string }[] | null
}

type Lead = {
  id: string
  org_name: string
  email: string
  captured_at: string
  status: string
  interviews: Interview[]
}

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const checkSessionAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          org_name,
          email,
          captured_at,
          status,
          interviews (
            id,
            status,
            stakeholder_name,
            stakeholder_role,
            transcript
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching lead details:', error)
      } else {
        setLead(data)
      }
      setLoading(false)
    }

    checkSessionAndFetch()
  }, [id, router])

  if (loading) {
    return <div className="min-h-screen bg-[#0E1117] text-white flex items-center justify-center">Loading...</div>
  }

  if (!lead) {
    return <div className="min-h-screen bg-[#0E1117] text-white flex items-center justify-center">Audit not found.</div>
  }

  return (
    <div className="min-h-screen bg-[#0E1117] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{lead.org_name}</h1>
        <p className="text-gray-400 mb-6">Audit initiated for {lead.email} on {new Date(lead.captured_at).toLocaleDateString()}</p>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Interviews</h2>
          <div className="space-y-4">
            {lead.interviews.map(interview => (
              <div key={interview.id} className="bg-gray-700 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{interview.stakeholder_name} <span className="text-gray-400 font-normal">({interview.stakeholder_role})</span></p>
                    <p className={`text-sm ${interview.status === 'complete' ? 'text-green-400' : 'text-yellow-400'}`}>{interview.status}</p>
                  </div>
                  {interview.status === 'complete' && (
                    <Link href={`/report/${lead.id}`} className="text-teal-400 hover:text-teal-300">
                      View Report
                    </Link>
                  )}
                </div>
                {interview.transcript && (
                  <div className="mt-4 p-3 bg-gray-600 rounded-md">
                    <p className="text-xs text-gray-300 italic">
                      &ldquo;{interview.transcript[0]?.content.substring(0, 100)}...&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
