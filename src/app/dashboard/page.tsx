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
  status: string
}

type Lead = {
  id: string
  org_name: string
  email: string
  status: string
  captured_at: string
  interviews: Interview[]
}

const statusColors: { [key: string]: string } = {
  captured: 'bg-blue-100 text-blue-800',
  interviewed: 'bg-yellow-100 text-yellow-800',
  reported: 'bg-green-100 text-green-800',
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
        if (leadIds.length > 0) {
          const { data: interviewsData } = await supabase
            .from('interviews')
            .select('id, lead_id, stakeholder_name, stakeholder_role, interview_token, status')
            .in('lead_id', leadIds)
          interviews = interviewsData || []
        }

        const merged: Lead[] = (leadsData || []).map((lead: any) => ({
          ...lead,
          interviews: interviews.filter((i) => i.lead_id === lead.id),
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
      <div className="pt-20 min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="pt-20 min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold mb-2">Your audits</h1>
          <p className="mb-6 text-gray-600">Log in to view your audit dashboard.</p>
          <Link
            href="/auth/login"
            className="bg-[#0D5C63] text-white font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Log in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <main className="p-4 sm:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Your Audits</h1>
        <p className="text-sm text-gray-500 mb-6">{user.email}</p>

        <div className="bg-white rounded-lg border">
          <div className="divide-y">
            {leads.length > 0 ? leads.map(lead => (
              <div key={lead.id} className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-4">
                    <FileText className="text-gray-400 mt-0.5 shrink-0" size={20} />
                    <div>
                      <h2 className="font-semibold">{lead.org_name}</h2>
                      <p className="text-sm text-gray-500">
                        {new Date(lead.captured_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </p>
                      {lead.interviews.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Users size={13} className="text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {lead.interviews.filter(i => i.status === 'complete').length}/{lead.interviews.length} interviews complete
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                      {lead.status}
                    </span>
                    <Link
                      href={`/audit/${lead.id}`}
                      className="flex items-center gap-1.5 text-sm bg-white border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
                    >
                      <PlayCircle size={15} />
                      View
                    </Link>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-3">No audits yet.</p>
                <Link href="/" className="text-teal-600 font-semibold hover:underline">
                  Start your first audit →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
