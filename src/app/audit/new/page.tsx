'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, ArrowRight, Loader2 } from 'lucide-react'

type Stakeholder = { name: string; role: string; email: string }

const INDUSTRIES = [
  'Retail / E-commerce','Financial Services','Healthcare','Manufacturing',
  'Professional Services','Education','Hospitality / Tourism','Logistics / Supply Chain',
  'Real Estate','Technology','Other',
]

const ROLES = [
  'CEO / Managing Director','COO / Operations','CFO / Finance','CTO / IT',
  'Sales / Business Development','Marketing','HR / People','Other',
]

export default function NewAuditPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState('')
  const [role, setRole] = useState('')
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([
    { name: '', role: '', email: '' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const addStakeholder = () =>
    setStakeholders(s => [...s, { name: '', role: '', email: '' }])

  const removeStakeholder = (i: number) =>
    setStakeholders(s => s.filter((_, idx) => idx !== i))

  const updateStakeholder = (i: number, field: keyof Stakeholder, val: string) =>
    setStakeholders(s => s.map((sh, idx) => idx === i ? { ...sh, [field]: val } : sh))

  const step1Valid = orgName.trim().length >= 2 && industry && role

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (step1Valid) setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const valid = stakeholders.filter(s => s.name.trim() && s.role.trim())
    if (!valid.length) { setError('Add at least one stakeholder.'); return }
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      // Create lead
      const leadRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/leads`,
        {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            org_name: orgName.trim(),
            industry,
            role,
            email: session.user.email,
            status: 'captured',
          }),
        }
      )
      if (!leadRes.ok) throw new Error('Failed to create audit record.')
      const [leadData] = await leadRes.json()
      const leadId = leadData.id

      // Send invites
      await fetch('/api/invites/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, stakeholders: valid }),
      })

      router.push(`/audit/${leadId}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1117] text-white">
      <header className="border-b border-white/10 px-6 py-4 sticky top-0 bg-[#0E1117]/90 backdrop-blur z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-teal-400 font-bold tracking-tight">Connai</span>
          <Link href="/dashboard" className="text-white/40 hover:text-white/70 text-xs transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {[1, 2].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= n ? 'bg-teal-500 text-white' : 'bg-white/10 text-white/40'}`}>
                {n}
              </div>
              {n < 2 && <div className={`w-12 h-px transition-colors ${step > n ? 'bg-teal-500' : 'bg-white/10'}`} />}
            </div>
          ))}
          <span className="ml-3 text-sm text-white/40">
            {step === 1 ? 'Organisation details' : 'Add stakeholders'}
          </span>
        </div>

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">New audit</h1>
              <p className="text-white/40 text-sm">Tell us about the organisation being assessed.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Organisation name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-teal-500/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Industry</label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500/60 transition-colors appearance-none"
                >
                  <option value="" className="bg-[#0E1117]">Select industry…</option>
                  {INDUSTRIES.map(i => (
                    <option key={i} value={i} className="bg-[#0E1117]">{i}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Your role at this organisation</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500/60 transition-colors appearance-none"
                >
                  <option value="" className="bg-[#0E1117]">Select role…</option>
                  {ROLES.map(r => (
                    <option key={r} value={r} className="bg-[#0E1117]">{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!step1Valid}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Continue <ArrowRight size={16} />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Add stakeholders</h1>
              <p className="text-white/40 text-sm">
                Each stakeholder gets a personalised interview link. Add as many as needed.
              </p>
            </div>

            <div className="space-y-3">
              {stakeholders.map((sh, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40 font-medium uppercase tracking-wider">
                      Stakeholder {i + 1}
                    </span>
                    {stakeholders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStakeholder(i)}
                        className="text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Full name"
                      value={sh.name}
                      onChange={e => updateStakeholder(i, 'name', e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/60 transition-colors"
                    />
                    <select
                      value={sh.role}
                      onChange={e => updateStakeholder(i, 'role', e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/60 transition-colors appearance-none"
                    >
                      <option value="" className="bg-[#0E1117]">Role…</option>
                      {ROLES.map(r => (
                        <option key={r} value={r} className="bg-[#0E1117]">{r}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="email"
                    placeholder="Email (optional — for invite link)"
                    value={sh.email}
                    onChange={e => updateStakeholder(i, 'email', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/60 transition-colors"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addStakeholder}
              className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"
            >
              <Plus size={15} /> Add another stakeholder
            </button>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating audit…</>
                ) : (
                  <>Launch audit <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
