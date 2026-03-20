'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'connai_admin_authed'
const PW_KEY      = 'connai_admin_pw'

type Interview = { id: string; status: string; stakeholder_email?: string; token: string }
type Report    = { lead_id: string; overall_score: number; pdf_url?: string | null }
type Lead = {
  id: string
  org_name: string
  email: string
  country?: string
  industry?: string
  status: string
  captured_at: string
  interviews: Interview[]
  report?: Report | null
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : ''

export default function AdminPage() {
  const [authed,    setAuthed]    = useState(false)
  const [hydrated,  setHydrated]  = useState(false)
  const [password,  setPassword]  = useState('')
  const [authError, setAuthError] = useState('')
  const [leads,     setLeads]     = useState<Lead[]>([])
  const [loading,   setLoading]   = useState(false)
  const [filter,    setFilter]    = useState<string>('all')
  const [search,    setSearch]    = useState('')

  // Invite modal state
  const [inviteLeadId, setInviteLeadId] = useState<string | null>(null)
  const [stakeEmail,   setStakeEmail]   = useState('')
  const [stakeName,    setStakeName]    = useState('')
  const [stakeRole,    setStakeRole]    = useState('')
  const [sending,      setSending]      = useState(false)
  const [sendErr,      setSendErr]      = useState<string | null>(null)
  const [sendOk,       setSendOk]       = useState<string | null>(null)

  useEffect(() => {
    const saved = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null
    if (saved === '1') {
      const storedPw = sessionStorage.getItem(PW_KEY) ?? ''
      setPassword(storedPw)
      setAuthed(true)
      loadLeads(storedPw)
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
      sessionStorage.setItem(PW_KEY, password)
      setAuthed(true)
      loadLeads(password)
    } else {
      setAuthError('Invalid password')
    }
  }

  function handleSignOut() {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(PW_KEY)
    setAuthed(false)
    setLeads([])
    setPassword('')
  }

  async function loadLeads(pw?: string) {
    setLoading(true)
    const token = pw ?? sessionStorage.getItem(PW_KEY) ?? ''
    const res = await fetch('/api/admin/leads', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
    if (res.ok) setLeads(await res.json())
    setLoading(false)
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteLeadId || !stakeEmail.trim()) return
    setSending(true); setSendErr(null); setSendOk(null)
    try {
      const r1 = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id:           inviteLeadId,
          stakeholder_email: stakeEmail.trim(),
          stakeholder_name:  stakeName.trim() || undefined,
          stakeholder_role:  stakeRole.trim() || undefined,
        }),
      })
      if (!r1.ok) { setSendErr('Failed to create interview'); setSending(false); return }
      const { token } = await r1.json()

      const r2 = await fetch('/api/interview/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!r2.ok) {
        setSendOk(`Interview created. Token: ${token} (email failed — send manually)`)
      } else {
        setSendOk(`Invite sent to ${stakeEmail.trim()}`)
      }
      setStakeEmail(''); setStakeName(''); setStakeRole(''); setInviteLeadId(null)
      loadLeads()
    } catch {
      setSendErr('Network error')
    } finally {
      setSending(false)
    }
  }

  const filtered = leads.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false
    if (search && !l.org_name.toLowerCase().includes(search.toLowerCase()) &&
        !l.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (!hydrated) return null

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="bg-white/5 border border-white/10 rounded-xl p-8 w-full max-w-sm space-y-4">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-white">Admin</h1>
            <p className="text-white/40 text-sm mt-1">Connai control panel</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50"
            required
            autoFocus
          />
          {authError && <p className="text-red-400 text-sm">{authError}</p>}
          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            Sign in
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-teal-400 font-bold text-lg">Connai</Link>
          <span className="text-white/20">/</span>
          <span className="text-white/60 text-sm">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button" onClick={() => loadLeads()}
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            &#8635; Refresh
          </button>
          <button
            type="button" onClick={() => window.open('/api/admin/leads-export', '_blank')}
            className="text-teal-400 hover:text-teal-300 text-sm transition-colors"
          >
            &#8595; Export CSV
          </button>
          <button
            type="button" onClick={handleSignOut}
            className="text-white/40 hover:text-red-400 text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 py-4 border-b border-white/5 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-white/40">Total leads </span>
          <span className="text-white font-semibold">{leads.length}</span>
        </div>
        <div>
          <span className="text-white/40">Pending </span>
          <span className="text-yellow-400 font-semibold">{leads.filter(l => l.status === 'pending').length}</span>
        </div>
        <div>
          <span className="text-white/40">Interviewed </span>
          <span className="text-teal-400 font-semibold">{leads.filter(l => l.status === 'interviewed').length}</span>
        </div>
        <div>
          <span className="text-white/40">Completed </span>
          <span className="text-green-400 font-semibold">{leads.filter(l => l.status === 'completed').length}</span>
        </div>
        <div>
          <span className="text-white/40">Reports </span>
          <span className="text-white font-semibold">{leads.filter(l => l.report).length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 flex flex-wrap gap-3 items-center border-b border-white/5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search org or email..."
          className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400/50 w-52"
        />
        {['all', 'pending', 'interviewed', 'completed'].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              filter === s
                ? 'bg-teal-600 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="text-center py-16 text-white/30">Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            {leads.length === 0 ? 'No leads yet.' : 'No leads match your filter.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(lead => {
              const completedIvs = lead.interviews.filter(i => i.status === 'complete').length
              const totalIvs = lead.interviews.length
              return (
                <div key={lead.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{lead.org_name}</div>
                      <div className="text-white/40 text-sm mt-0.5">{lead.email}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {lead.industry && (
                          <span className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full">{lead.industry}</span>
                        )}
                        {lead.country && (
                          <span className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full">{lead.country}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          lead.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          lead.status === 'interviewed' ? 'bg-teal-500/20 text-teal-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>{lead.status}</span>
                        <span className="text-xs text-white/30">
                          {new Date(lead.captured_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {lead.report && (
                        <Link
                          href={`/report/${lead.id}`}
                          className="text-xs bg-teal-600/20 text-teal-400 px-3 py-1 rounded-full hover:bg-teal-600/40 transition-colors"
                        >
                          Score: {lead.report.overall_score} &rarr; View report
                        </Link>
                      )}
                      <Link
                        href={`/audit/${lead.id}`}
                        className="text-xs bg-white/5 text-white/50 px-3 py-1 rounded-full hover:bg-white/10 transition-colors"
                      >
                        Manage &rarr;
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setInviteLeadId(lead.id); setSendOk(null); setSendErr(null) }}
                        className="text-xs bg-white/5 text-white/50 px-3 py-1 rounded-full hover:bg-white/10 transition-colors"
                      >
                        + Invite stakeholder
                      </button>
                    </div>
                  </div>

                  {/* Interviews summary */}
                  {totalIvs > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="text-xs text-white/30 mb-2">
                        Interviews: <span className="text-white/60">{completedIvs}/{totalIvs} complete</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {lead.interviews.map(iv => (
                          <a
                            key={iv.id}
                            href={`${BASE_URL}/interview/${iv.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              iv.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                              iv.status === 'in_progress' ? 'bg-teal-500/20 text-teal-400' :
                              'bg-white/5 text-white/40'
                            }`}
                          >
                            {iv.stakeholder_email ?? iv.id.slice(0, 8)} &middot; {iv.status}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {inviteLeadId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#151922] border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold mb-4">Invite stakeholder</h3>
            <form onSubmit={handleSendInvite} className="space-y-3">
              <input
                type="email"
                value={stakeEmail}
                onChange={e => setStakeEmail(e.target.value)}
                placeholder="Email address *"
                required
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400/50"
              />
              <input
                type="text"
                value={stakeName}
                onChange={e => setStakeName(e.target.value)}
                placeholder="Name (optional)"
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400/50"
              />
              <input
                type="text"
                value={stakeRole}
                onChange={e => setStakeRole(e.target.value)}
                placeholder="Role (optional)"
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400/50"
              />
              {sendErr && <p className="text-red-400 text-sm">{sendErr}</p>}
              {sendOk  && <p className="text-teal-400 text-sm">{sendOk}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setInviteLeadId(null)}
                  className="px-4 text-white/40 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
