'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const INDUSTRIES = [
  'Technology / Software', 'Financial Services', 'Healthcare',
  'Retail / E-commerce', 'Manufacturing', 'Professional Services',
  'Education', 'Government / Public Sector', 'Media & Entertainment', 'Other',
]

const ROLES = [
  'C-Suite / Executive', 'Director / VP', 'Manager', 'Consultant / Advisor', 'Other',
]

export default function NewAuditPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { session } } = await sb.auth.getSession()
        if (!session) { router.push('/auth/login'); return }
        setEmail(session.user.email ?? '')
      } catch {} finally { setCheckingAuth(false) }
    }
    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedOrg = orgName.trim()
    if (!trimmedOrg || trimmedOrg.length < 2) {
      setError('Please enter a valid organisation name (at least 2 characters).')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: trimmedOrg,
          industry: industry || undefined,
          role: role || undefined,
          email,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.lead_id) {
        setError(data.error ?? 'Something went wrong.')
        setLoading(false)
        return
      }
      router.push(`/audit/${data.lead_id}`)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (checkingAuth) return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Start a new audit</h1>
        <p className="text-white/60 text-sm mb-8">
          Enter the organisation you want to assess.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="audit-org-name" className="block text-sm font-medium text-white/70 mb-1">
              Organisation name
            </label>
            <input
              type="text"
              required
              value={orgName}
              id="audit-org-name"
              onChange={e => setOrgName(e.target.value)}
              placeholder="Company name"
              className="w-full bg-white/5 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus:border-teal-500/50 placeholder:text-white/30 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="audit-industry" className="block text-sm font-medium text-white/70 mb-1">
              Industry <span className="text-white/40 font-normal">(optional)</span>
            </label>
            <select
              id="audit-industry"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full bg-[#0E1117] border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus:border-teal-500/50 transition-colors"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="audit-role" className="block text-sm font-medium text-white/70 mb-1">
              Your role <span className="text-white/40 font-normal">(optional)</span>
            </label>
            <select
              id="audit-role"
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full bg-[#0E1117] border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus:border-teal-500/50 transition-colors"
            >
              <option value="">Select role</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1117]"
          >
            {loading ? 'Creating...' : 'Start audit →'}
          </button>
        </form>
      </div>
    </div>
  )
}
