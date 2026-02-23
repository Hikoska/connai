'use client'

import { useEffect, useState } from 'react'

interface Interview {
  id: string
  stakeholder_email: string
  organisation: string
  country: string
  industry: string | null
  status: string
  created_at: string
  completed_at: string | null
}

interface Report {
  id: string
  interview_id: string
  dimensions: Record<string, number | string>
  pack_type: string
  created_at: string
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setAuthed(true)
      loadData()
    } else {
      setError('Invalid password')
    }
  }

  const loadData = async () => {
    setLoading(true)
    const [intRes, repRes] = await Promise.all([
      fetch('/api/admin/interviews'),
      fetch('/api/admin/reports'),
    ])
    if (intRes.ok) setInterviews(await intRes.json())
    if (repRes.ok) setReports(await repRes.json())
    setLoading(false)
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950">
        <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded-xl w-full max-w-sm space-y-4">
          <h1 className="text-white text-xl font-bold">Connai Admin</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
          >
            Sign in
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Connai Admin Dashboard</h1>
          <button onClick={loadData} className="text-sm text-gray-400 hover:text-white">
            Refresh
          </button>
        </div>

        {loading && <p className="text-gray-400">Loading...</p>}

        {/* Interviews */}
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-300">
            Interviews ({interviews.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Organisation</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Country</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map(iv => (
                  <tr key={iv.id} className="border-b border-gray-800/50 hover:bg-gray-900">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-400">{iv.id.slice(0, 8)}</td>
                    <td className="py-2 pr-4">{iv.stakeholder_email}</td>
                    <td className="py-2 pr-4">{iv.organisation}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        iv.status === 'completed' ? 'bg-green-900 text-green-300' :
                        iv.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-gray-800 text-gray-400'
                      }`}>{iv.status}</span>
                    </td>
                    <td className="py-2 pr-4">{iv.country}</td>
                    <td className="py-2 text-gray-400 text-xs">{new Date(iv.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {interviews.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-gray-500 text-center">No interviews yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reports */}
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-300">
            Reports ({reports.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">Interview ID</th>
                  <th className="pb-2 pr-4">Pack</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(rp => (
                  <tr key={rp.id} className="border-b border-gray-800/50 hover:bg-gray-900">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-400">{rp.id.slice(0, 8)}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-400">{rp.interview_id.slice(0, 8)}</td>
                    <td className="py-2 pr-4">{rp.pack_type}</td>
                    <td className="py-2 text-gray-400 text-xs">{new Date(rp.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-gray-500 text-center">No reports yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
