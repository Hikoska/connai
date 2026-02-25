'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  )
}

export default function LoginPage() {
  const [loading, setLoading] = useState<'google' | 'azure' | null>(null)
  const [error, setError] = useState('')

  const signIn = async (provider: 'google' | 'azure') => {
    setLoading(provider)
    setError('')
    try {
      // PKCE flow required — callback page uses exchangeCodeForSession
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { flowType: 'pkce' } }
      )
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // skipBrowserRedirect: true lets us control navigation explicitly
          // so the button never hangs if auto-redirect silently fails
          skipBrowserRedirect: true,
          scopes: provider === 'azure' ? 'openid email profile' : undefined,
          queryParams: provider === 'azure' ? { prompt: 'select_account' } : undefined,
        },
      })
      if (oauthError || !data?.url) {
        setError(oauthError?.message ?? 'Sign-in configuration error. Please try again.')
        setLoading(null)
        return
      }
      // Navigate — page unloads, no need to clear loading state
      window.location.assign(data.url)
    } catch {
      setError('Unexpected error. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold text-teal-400 tracking-tight">Connai</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Sign in to your account</h1>
          <p className="text-white/40 text-sm">Access your digital maturity reports and audits</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => signIn('google')}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 px-4 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 active:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading === 'google' ? (
              <span className="text-gray-500">Connecting to Google...</span>
            ) : (
              <><GoogleIcon /><span>Continue with Google</span></>
            )}
          </button>

          <button
            onClick={() => signIn('azure')}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 bg-[#2C2C2C] text-white border border-white/10 px-4 py-3 rounded-xl font-medium text-sm hover:bg-[#383838] active:bg-[#444] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'azure' ? (
              <span className="text-white/60">Connecting to Microsoft...</span>
            ) : (
              <><MicrosoftIcon /><span>Continue with Microsoft</span></>
            )}
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}

        <div className="text-center space-y-3">
          <p className="text-white/20 text-xs">Don&apos;t have an account yet?</p>
          <a
            href="/"
            className="inline-block text-teal-400 text-sm font-medium hover:text-teal-300 transition"
          >
            Start a free audit {'->'}
          </a>
        </div>

        <p className="text-center text-white/20 text-xs leading-relaxed">
          By signing in you agree to our{' '}
          <a href="/terms" className="underline hover:text-white/40">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="underline hover:text-white/40">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
