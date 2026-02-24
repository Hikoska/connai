'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { FileText, PlayCircle, Users } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

type Interview = {
  id: string
  lead_id: string
  stakeholder_name: string
  stakeholder_role: string
  interview_token: string
}

type Lead = {
  id: string
  created_at: string
  status: string
  interviews: Interview[]
}

const statusColors: { [key: string]: string } = {
  in_progress: 'bg-yellow-100 text-yellow-800',
  complete: 'bg-green-100 text-green-800',
  partial: 'bg-blue-100 text-blue-800',
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const supabaseRef = useRef<SupabaseClient | null>(null)

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

        const { data: leadsData, error: leadsError } = await supabase
          .from('leads')
          .select('id, created_at, status')
          .order('created_at', { ascending: false })

        if (leadsError) {
          console.error('Error fetching leads:', leadsError)
          setLoading(false)
          return
        }

        const leadIds = (leadsData || []).map((l: any) => l.id)
        let interviews: Interview[] = []
        if (leadIds.length > 0) {
          const { data: interviewsData } = await supabase
            .from('interviews')
            .select('id, lead_id, stakeholder_name, stakeholder_role, interview_token')
            .in('lead_id', leadIds)
          interviews = interviewsData || []
        }

        const merged: Lead[] = (leadsData || []).map((lead: any) => ({
          ...lead,
          interviews: interviews.filter((i) => i.lead_id === lead.id),
        }))

        setLeads(merged)
      }
      setLoading(false)
    }

    init()
  }, [])

  const handleLogout = async () => {
    if (supabaseRef.current) {
      await supabaseRef.current.auth.signOut()
    }
    setUser(null)
    window.location.href = '/'
  }

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="mb-6 text-gray-600">Please log in to view your audit dashboard.</p>
          <Link href="/auth/login" className="bg-[#0D5C63] text-white font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧬</span>
            <span className="font-bold text-teal-500 text-xl">Connai Dashboard</span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-gray-600 hover:text-teal-500">
            Log out
          </button>
        </div>
      </header>
      <main className="p-4 sm:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Your Audits</h1>
        <p className="text-sm text-gray-500 mb-6">Showing all audits for {user.email}</p>

        <div className="bg-white rounded-lg border">
          <div className="divide-y">
            {leads.length > 0 ? leads.map(lead => (
              <div key={lead.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <FileText className="text-gray-400 mt-1" />
                    <div>
                      <h2 className="font-semibold">Digital Maturity Audit</h2>
                      <p className="text-sm text-gray-500">
                        Started: {new Date(lead.created_at).toLocaleString()}
                      </p>
                      {lead.interviews.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Users size={14} className="text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {lead.interviews.length} stakeholder{lead.interviews.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                      {lead.status?.replace('_', ' ')}
                    </span>
                    {lead.interviews.length > 0 && (
                      <Link
                        href={`/audit/${lead.interviews[0].interview_token}`}
                        className="flex items-center gap-1.5 text-sm bg-white border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-100"
                      >
                        <PlayCircle size={16} />
                        Resume
                      </Link>
                    )}
                  </div>
                </div>
                {lead.interviews.length > 1 && (
                  <div className="mt-3 ml-10 space-y-1">
                    {lead.interviews.map((interview) => (
                      <div key={interview.id} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">
                        <span>{interview.stakeholder_name} <span className="text-gray-400">·</span> {interview.stakeholder_role}</span>
                        <Link href={`/audit/${interview.interview_token}`} className="text-teal-600 hover:underline text-xs">
                          Open →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500">
                <p>You have no audits yet.</p>
                <Link href="/" className="text-teal-500 font-semibold mt-2 inline-block">
                  Start your first audit &#8594;
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
