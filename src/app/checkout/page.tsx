'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const reportId = searchParams.get('reportId')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect to dashboard if no reportId param
  useEffect(() => {
    if (!reportId) { router.replace('/dashboard') }
  }, [reportId, router])

  const handleCheckout = async () => {
    if (!reportId) { setError('Missing report ID. Please return to your report.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Could not create checkout session. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (!reportId) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-900/30 text-teal-300 text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-teal-700/40">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            Premium Unlock
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Unlock Your Full Report</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Your digital maturity scores are ready. Unlock the AI action plan and strategic roadmap.
          </p>
        </div>

        {/* Pricing card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-bold text-2xl">$49</p>
              <p className="text-white/50 text-xs mt-0.5">one-time · per report</p>
            </div>
            <div className="bg-teal-900/40 border border-teal-500/30 text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full">
              Full Access
            </div>
          </div>

          <ul className="space-y-2.5 mb-6">
            {[
              'AI-generated executive summary',
              'Full 3-tier action plan (Quick Wins / 6-Month / Strategic)',
              'Priority improvement roadmap',
              'Branded PDF export',
              'Shareable report link',
              'All 8 dimension scores + industry benchmarks',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                <span className="text-teal-400 mt-0.5 flex-shrink-0">✔</span>
                {item}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-red-400 text-sm mb-4 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1117] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Redirecting to payment…
              </>
            ) : (
              'Pay $49 · Secure checkout'
            )}
          </button>

          <p className="text-center text-white/30 text-xs mt-3">
            Powered by Stripe · Secure · Instant access after payment
          </p>
        </div>

        {/* Beta notice */}
        <div className="bg-yellow-900/20 border border-yellow-500/20 text-yellow-300 text-xs p-3 rounded-xl text-center">
          <span className="font-bold">Beta offer:</span> Your first report is always free.
          Premium unlock required for action plan + PDF export.
        </div>

        <p className="text-center mt-5">
          <Link
            href={`/report/${reportId}`}
            className="text-white/40 hover:text-white/70 text-xs underline underline-offset-4 transition-colors"
          >
            ← Back to report
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
