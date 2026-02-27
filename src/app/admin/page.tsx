'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'connai_admin_authed'

type Interview = { id: string; status: string }
type Report    = { lead_id: string; overall_score: number; pdf_url?: string | null }
type Lead = {
  id:          string
  org_name:    string
  email:       string
  status:      string
  captured_at: string
  interviews:  Interview[]
  reports:     Report[]
}

const STATUS_PILL: Record<string, string> = {
  captured:    'bg-blue-500/20   text-blue-300   border border-blue-500/30',
  interviewed: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  reported:    'bg-green-500/20  text-green-300  border border-green-500/30',
}

function scoreTier(s: number): { label: string; color: string } {
  if (s >= 80) return { label: 'Digital Leader',     color: 'text-teal-400'   }
  if (s >= 60) return { label: 'Digitally Advanced', color: 'text-blue-400'   }
  if (s >= 40) return { label: 'Digitally Active',   color: 'text-yellow-400' }
  if (s >= 20) return { label: 'Digitally Emerging', color: 'text-orange-400' }
  return              { label: 'Digitally Dormant',  color: 'text-red-400'    }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: '2-digit',
  })
}

export default function AdminLeadsPage() {
  const [authed,    setAuthed]    = useState(false)
  const [hydrated,  setHydrated]  = useState(false)
  const [password,  setPassword]  = useState('')
  const [authError, setAuthError] = useState('')
  const [leads,     setLeads]     = useState<Lead[]>([])
  const [loading,   setLoading]   = useState(false)
  const [filter,    setFilter]    = useState<string>('all')
  const [search,    setSearch]    = useState('')

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null
    if (saved === '1') {
      setAuthed(true)
      loadLeads()
    }
    setHydrated(true)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      localStorage.setItem(STORAGE_KEY, '1')
      setAuthed(true)
      loadLeads()
    } else {
      setAuthError('Invalid password')
    }
  }

  function handleSignOut() {
    localStorage.removeItem(STORAGE_KEY)
    setAuthed(false)
    setLeads([])
    setPassword('')
  }

  async function loadLeads() {
    setLoading(true)
    const res = await fetch('/api/admin/leads')
    if (res.ok) setLeads(await res.json())
    setLoading(false)
  }

  // Prevent flash of login gate if restoring session
  if (!hydrated) return null

  /* --------- AUTH GATE --------- */
  if (!authed) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="bg-gray-900 border border-gray-800 p-8 rounded-xl w-full max-w-sm space-y-4"
        >
          <div>
            <h1 className="text-white text-xl font-bold">Admin Access</h1>
            <p className="text-gray-500 text-sm mt-1">Connai internal access only</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
            required
          />
          {authError && <p className="text-red-400 text-sm">{authError}</p>}
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

  /* --------- DATA --------- */
  const counts = {
    total:       leads.length,
    captured:    leads.filter(l => l.status === 'captured').length,
    interviewed: leads.filter(l => l.status === 'interviewed').length,
    reported:    leads.filter(l => l.status === 'reported').length,
  }

  const visible = leads.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return l.org_name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q)
    }
    return true
  })

  /* --------- UI --------- */
  return (
    <div className="flex-1 p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">All Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every organisation that started an assessment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadLeads}
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span className="text-base">↻</span> Refresh
          </button>
          <button
            onClick={() => window.open('/api/admin/leads-export', '_blank')}
            className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg"
          >
            Export CSV
          </button>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { key: 'all',         label: 'Total',       value: counts.total,       color: 'text-white'      },
          { key: 'captured',    label: 'Captured',    value: counts.captured,    color: 'text-blue-400'   },
          { key: 'interviewed', label: 'Interviewed', value: counts.interviewed, color: 'text-yellow-400' },
          { key: 'reported',    label: 'Reported',    value: counts.reported,    color: 'text-green-400'  },
        ] as const).map(stat => (
          <button
            key={stat.key}
            onClick={() => setFilter(stat.key)}
            className={`text-left bg-gray-900 border rounded-xl px-4 py-3 transition-colors ${
              filter === stat.key
                ? 'border-gray-600 bg-gray-800'
                : 'border-gray-800 hover:border-gray-700'
            }`}
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by organisation or email…"
        className="w-full sm:w-72 bg-gray-900 border border-gray-800 text-white text-sm px-4 py-2 rounded-lg placeholder-gray-600 focus:outline-none focus:border-gray-600"
      />

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <span className="animate-spin">⟳</span> Loading leads…
        </div>
      )}

      {/* Table */}
      {!loading && visible.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800 bg-gray-900/50">
                  <th className="px-4 py-3">Organisation</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Interviews</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Captured</th>
                  <th className="px-4 py-3">Report</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(lead => {
                  const report  = lead.reports?.[0]
                  const score   = report?.overall_score
                  const tier    = score != null ? scoreTier(score) : null
                  const ivDone  = lead.interviews?.filter(iv => iv.status === 'complete').length ?? 0
                  const ivTotal = lead.interviews?.length ?? 0

                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-white">{lead.org_name}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{lead.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_PILL[lead.status] ?? 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        <span className={ivDone === ivTotal && ivTotal > 0 ? 'text-green-400' : ''}>
                          {ivDone}/{ivTotal}
                        </span>
                        {ivTotal > 0 && (
                          <span className="text-gray-600 ml-1 text-xs">done</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tier ? (
                          <span className={`font-semibold tabular-nums ${tier.color}`}>
                            {score!.toFixed(0)}
                            <span className="text-gray-600 font-normal text-xs ml-1">/100</span>
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(lead.captured_at)}</td>
                      <td className="px-4 py-3">
                        {report ? (
                          <Link
                            href={`/report/${lead.id}`}
                            target="_blank"
                            className="text-blue-400 hover:text-blue-300 underline text-xs"
                          >
                            View ↗
                          </Link>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-600">
            Showing {visible.length} of {leads.length} lead{leads.length !== 1 ? 's' : ''}
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="ml-3 text-gray-400 hover:text-white underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
          <p className="text-gray-500">
            {search || filter !== 'all' ? 'No leads match your filter.' : 'No leads yet.'}
          </p>
          {(search || filter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilter('all') }}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
