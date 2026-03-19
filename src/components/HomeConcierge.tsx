'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const ROLES = ['CEO / Owner', 'Operations', 'IT / Digital', 'Just exploring'] as const
type Role = typeof ROLES[number]

const ROLE_CONTENT: Record<Role, { headline: string; cta: string }> = {
  'CEO / Owner': {
    headline: "You'll get a full digital health score for your org in 20 min &mdash; at a fraction of consultant cost.",
    cta: 'Start my free audit &rarr;',
  },
  'Operations': {
    headline: 'Connai maps your process gaps and benchmarks them against your sector. Takes 20 min.',
    cta: 'Run the audit &rarr;',
  },
  'IT / Digital': {
    headline: "You'll get a scored breakdown of your digital infrastructure and adoption gaps across 8 dimensions.",
    cta: 'See what it covers &rarr;',
  },
  'Just exploring': {
    headline: 'Most people get their first audit done in under 10 minutes. No consultants, no forms.',
    cta: 'Try it free &rarr;',
  },
}

export default function HomeConcierge() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('concierge_dismissed')) return
    const isAppPage = pathname && (
      pathname.startsWith('/auth') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/interview') ||
      pathname.startsWith('/report') ||
      pathname.startsWith('/dashboard')
    )
    if (isAppPage) return
    const t = setTimeout(() => setVisible(true), 5000)
    return () => clearTimeout(t)
  }, [pathname])

  const dismiss = () => {
    sessionStorage.setItem('concierge_dismissed', '1')
    setVisible(false)
  }

  const selectRole = (r: Role) => {
    setRole(r)
    setStep(2)
  }

  if (!visible) return null

  const content = role ? ROLE_CONTENT[role] : null

  return (
    <div
      className={`fixed bottom-36 right-5 z-40 w-[300px] transition-all duration-500 ease-out
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      <div className="bg-slate-900 border border-teal-600/40 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wide">Connai Guide</span>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-white/50 hover:text-white/80 transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>

        <div className="px-4 py-4">
          {step === 1 && (
            <div>
              <p className="text-white font-semibold text-sm mb-3">
                &#x1F44B; What brings you to Connai today?
              </p>
              <div className="flex flex-col gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => selectRole(r)}
                    className="text-left text-sm text-white/80 hover:text-white bg-white/5 hover:bg-teal-700/40 border border-white/20 hover:border-teal-500/50 px-3 py-2 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && content && (
            <div>
              <p className="text-white font-semibold text-sm mb-4">{content.headline}</p>
              <a
                href="/audit/new"
                className="block w-full text-center bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                {content.cta}
              </a>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-xs text-white/50 hover:text-white/80 mt-2 transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
              >
                &larr; Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
