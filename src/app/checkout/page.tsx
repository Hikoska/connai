'use client'
import { useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { useState } from 'react'
import Link from 'next/link'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const PACKS = [
  { key: 'starter', name: 'Starter Pack', interviews: 5, price: 500, per: 100 },
  { key: 'team', name: 'Team Pack', interviews: 20, price: 1500, per: 75, popular: true },
  { key: 'department', name: 'Department Pack', interviews: 50, price: 3500, per: 70 },
  { key: 'company', name: 'Company Pack', interviews: 100, price: 6000, per: 60 },
]

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const preselected = searchParams.get('pack') || 'team'
  const [selected, setSelected] = useState(preselected)
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: selected }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setLoading(false)
  }

  return (
    <div className="min-h-screen bg-teal-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/dashboard" className="text-teal-500 text-sm">← Back to dashboard</Link>
          <h1 className="text-3xl font-bold mt-4">Choose your interview pack</h1>
          <p className="text-gray-500 mt-2">Credits valid for 12 months. Buy once, use anytime.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {PACKS.map(pack => (
            <button key={pack.key} onClick={() => setSelected(pack.key)}
              className={`text-left p-6 rounded-xl border-2 transition-all ${
                selected === pack.key
                  ? 'border-teal-500 bg-white shadow-md'
                  : 'border-gray-200 bg-white hover:border-teal-300'
              }`}>
              {pack.popular && (
                <span className="text-xs bg-teal-500 text-white px-2 py-1 rounded-full font-bold mb-3 inline-block">Most Popular</span>
              )}
              <div className="font-bold text-lg">{pack.name}</div>
              <div className="text-gray-500 text-sm">{pack.interviews} interviews</div>
              <div className="text-3xl font-bold text-teal-500 mt-3">${pack.price.toLocaleString()}</div>
              <div className="text-gray-400 text-xs">${pack.per}/interview</div>
              {selected === pack.key && <div className="mt-3 text-teal-500 font-medium text-sm">✓ Selected</div>}
            </button>
          ))}
        </div>

        <div className="card mb-6">
          <h3 className="font-semibold mb-3">What you get</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2"><span className="text-teal-500">✓</span> AI-conducted interviews with full transcript</li>
            <li className="flex items-center gap-2"><span className="text-teal-500">✓</span> Full report: risk register, opportunity map, action plan</li>
            <li className="flex items-center gap-2"><span className="text-teal-500">✓</span> Downloadable PDF report</li>
            <li className="flex items-center gap-2"><span className="text-teal-500">✓</span> Credits valid 12 months, roll forward within window</li>
          </ul>
        </div>

        <button onClick={handleCheckout} disabled={loading} className="btn-primary w-full text-lg py-4">
          {loading ? 'Redirecting to checkout...' : `Pay $${PACKS.find(p => p.key === selected)?.price.toLocaleString()} →`}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">Secure payment via Stripe · Refund policy applies</p>
      </div>
    </div>
  )
}
