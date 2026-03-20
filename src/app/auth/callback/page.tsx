'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function handleCallback() {
      try {
        const url = window.location.href
        const code = new URL(url).searchParams.get('code')
        const next = new URL(url).searchParams.get('next')

        if (code) {
          // PKCE flow: exchange code for session — createBrowserClient writes cookie automatically
          const { error } = await supabase.auth.exchangeCodeForSession(url)
          if (error) {
            console.error('Auth callback error:', error.message)
            router.replace('/auth/login')
            return
          }
        } else {
          // Implicit flow: give supabase-js time to parse hash fragment into cookies
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/auth/login')
          return
        }

        // Honour explicit ?next= param
        if (next) {
          router.replace(next)
          return
        }

        // Check if new user — if no leads yet, send to onboarding
        try {
          const res = await fetch('/api/me/audits', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (res.ok) {
            const { leads } = await res.json()
            if (!leads || leads.length === 0) {
              router.replace('/audit/new')
              return
            }
          }
        } catch {
          // Non-fatal — fall through to dashboard
        }

        router.replace('/dashboard')
      } catch {
        router.replace('/auth/login')
      }
    }

    handleCallback()
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
