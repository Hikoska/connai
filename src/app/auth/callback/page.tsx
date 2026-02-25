'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // createClient inside useEffect — browser-only, never runs at build time
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        if (error) {
          console.error('Auth callback error:', error.message)
          router.replace('/auth/login?error=auth_failed')
        } else {
          router.replace('/dashboard')
        }
      })
  }, [router])

  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
