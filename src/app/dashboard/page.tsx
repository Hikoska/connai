'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Create a single supabase client for client-side use
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Session = {
  id: string
  started_at: string
  status: string
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

        if (error) {
          console.error('Error fetching sessions:', error)
        } else {
          setSessions(data || [])
        }
      }
      setLoading(false)
    }

    checkUserAndFetchSessions()
  }, [])
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    // You might want to redirect the user to the homepage after logout
    window.location.href = '/'
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">Please log in to view your dashboard.</p>
        <Link href="/auth/login" className="text-teal-500 font-medium">
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Audits</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-teal-500">
          Log out
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        {sessions.length === 0 ? (
          <p className="text-gray-500">You don&apos;t have any audit sessions yet. <Link href="/" className="text-teal-500">Start a new one!</Link></p>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <div key={session.id} className="p-4 border rounded-md bg-gray-50 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold capitalize">
                    {session.status.replace('_', ' ')} Audit Session
                  </h2>
                  <p className="text-sm text-gray-500">
                    Started: {new Date(session.started_at).toLocaleString()}
                  </p>
                </div>
                <button className="btn-secondary text-sm py-1 px-3">
                  Resume
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
