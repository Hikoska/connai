'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, PlayCircle } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Session = {
  id: string
  started_at: string
  status: string
}

const statusColors: { [key: string]: string } = {
  in_progress: 'bg-yellow-100 text-yellow-800',
  complete: 'bg-green-100 text-green-800',
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUserAndFetchSessions = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        const { data, error } = await supabase
          .from('audit_sessions')
          .select('id, started_at, status')
          .eq('user_id', session.user.id)
          .order('started_at', { ascending: false })
        if (error) console.error('Error fetching sessions:', error)
        else setSessions(data || [])
      }
      setLoading(false)
    }
    checkUserAndFetchSessions()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>

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
            <span className="text-2xl">🔭</span>
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
            {sessions.length > 0 ? sessions.map(session => (
              <div key={session.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <FileText className="text-gray-400" />
                  <div>
                    <h2 className="font-semibold">Digital Maturity Audit</h2>
                    <p className="text-sm text-gray-500">
                      Started: {new Date(session.started_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[session.status] || 'bg-gray-100 text-gray-800'}`}>
                    {session.status.replace('_', ' ')}
                  </span>
                  <button className="flex items-center gap-1.5 text-sm bg-white border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-100">
                    <PlayCircle size={16} />
                    Resume
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500">
                <p>You have no audit sessions yet.</p>
                <Link href="/" className="text-teal-500 font-semibold mt-2 inline-block">Start your first audit →</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
