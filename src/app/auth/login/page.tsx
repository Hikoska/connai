'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Countdown timer for magic link cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOTP({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
    } else {
      setMessage(`Magic link sent to ${email}. Check your inbox (and spam folder) \u2014 it arrives in under a minute.`)
      setCooldown(60)
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4 bg-[radial-gradient(ellipse_at_top,#0D5C6318,transparent_60%)]">
      {/* WCAG 2.4.1 skip-link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <div id="main-content" className="w-full max-w-sm space-y-6 border border-[#0D5C63]/50 rounded-xl p-8 bg-white/5 backdrop-blur-sm">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
          >
            <span className="text-2xl font-bold text-teal-400 tracking-tight">Connai</span>
          </Link>
          <h1 className="text-xl font-semibold text-white">Sign in to your account</h1>
          <p className="text-white/40 text-sm">Enter your email to receive a magic link</p>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          {googleLoading ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-500 transition"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {message && (
            <div className="bg-teal-900/30 border border-teal-700/50 rounded-lg px-4 py-3">
              <p className="text-teal-300 text-sm leading-relaxed">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading || !email || cooldown > 0}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            {loading ? 'Sending link...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send magic link'}
          </button>
        </form>

        <p className="text-center text-white/30 text-xs">
          By signing in, you agree to our{' '}
          <Link href="/privacy" className="underline hover:text-white/60">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
