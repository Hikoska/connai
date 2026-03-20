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

export const dynamic = 'force-dynamic'

export default function AuditNewPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [orgNameTouched, setOrgNameTouched] = useState(false)
  const [industry, setIndustry] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  const orgNameError = orgNameTouched && !orgName.trim()

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) router.push('/auth/login')
      } catch {
        router.push('/auth/login')
      } finally {
        setCheckingAuth(false)
      }
    }
    check()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setOrgNameTouched(true)
    if (!orgName.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: orgName.trim(),
          industry: industry || undefined,
          role: role || undefined,
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
    <>
      {/* WCAG 2.4.1 skip-link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        Skip to main content
      </a>
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4">
        <div id="main-content" className="w-full max-w-md">
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
                onChange={e => { setOrgName(e.target.value); if (orgNameTouched && e.target.value.trim()) setOrgNameTouched(false) }}
                onBlur={() => setOrgNameTouched(true)}
                placeholder="Company name"
                aria-describedby={orgNameError ? 'org-name-error' : undefined}
                aria-invalid={orgNameError}
                className={`w-full bg-white/5 border text-white rounded-lg px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 placeholder:text-white/30 transition-colors ${
                  orgNameError
                    ? 'border-red-500/70 focus:border-red-500'
                    : 'border-white/20 focus:border-teal-500/50'
                }`}
              />
              {orgNameError && (
                <p id="org-name-error" className="mt-1 text-xs text-red-400">
                  Organisation name is required
                </p>
              )}
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
              disabled={loading || !orgName.trim()}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1117]"
            >
              {loading ? 'Creating...' : 'Start audit →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
