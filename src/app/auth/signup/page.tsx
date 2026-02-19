'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error: signupError } = await supabase.auth.signUp({
      email, password,
      options: { data: { company_name: company } }
    })
    if (signupError) { setError(signupError.message); setLoading(false); return }
    // Create org record
    if (data.user) {
      await supabase.from('organisations').insert({
        name: company || 'My Company',
        owner_id: data.user.id,
        plan_type: 'free',
        pack_credits_remaining: 1,
      })
    }
    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🔭</span>
          <h1 className="text-2xl font-bold mt-2">Start your free audit</h1>
          <p className="text-gray-500 text-sm mt-1">1 interview + basic report included</p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-300"
              required placeholder="Acme Corp" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-300"
              required placeholder="you@company.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-300"
              required minLength={8} placeholder="8+ characters" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Start free audit →'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-4">
          By signing up you agree to our Terms of Service
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          Already have an account? <Link href="/auth/login" className="text-teal-500 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
