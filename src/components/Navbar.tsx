'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ConnaiMark } from './ConnaiLogo'

const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
]

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [session, setSession] = useState<{ email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setIsMenuOpen(false)
    setIsAccountOpen(false)
  }, [pathname])

  useEffect(() => {
    const initSession = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { session: s } } = await sb.auth.getSession()
        setSession(s ? { email: s.user.email ?? '' } : null)

        sb.auth.onAuthStateChange((_event, newSession) => {
          setSession(newSession ? { email: newSession.user.email ?? '' } : null)
        })
      } catch {}
      setLoading(false)
    }
    initSession()
  }, [])

  const handleSignOut = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await sb.auth.signOut()
      setSession(null)
      router.push('/')
    } catch {}
  }

  const isHomePage = pathname === '/'

  return (
    <header className="sticky top-0 z-50 bg-[#0D2738]/95 backdrop-blur border-b border-white/5">
      <nav className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
          >
            <ConnaiMark size={28} />
            <span className="text-white font-bold text-lg tracking-tight">Connai</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {isHomePage && NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 bg-white/5 rounded-lg animate-pulse" />
            ) : session ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                  className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
                  aria-expanded={isAccountOpen}
                  aria-haspopup="true"
                  aria-label="Account menu"
                >
                  <span className="w-7 h-7 bg-teal-700/50 rounded-full flex items-center justify-center text-xs font-bold text-teal-300">
                    {session.email[0].toUpperCase()}
                  </span>
                  <span className="max-w-[120px] truncate">{session.email}</span>
                  <svg className={`w-3 h-3 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isAccountOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl py-1 z-50">
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors">Dashboard</Link>
                    <Link href="/audit/new" className="block px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors">New audit</Link>
                    <div className="border-t border-white/5 my-1" />
                    <button type="button" onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Sign in
                </Link>

                {/* FIXED: was href='#' -- now navigates to /audit/new */}
                <Link
                  href="/audit/new"
                  className="text-sm bg-teal-600 hover:bg-teal-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  Start free
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded p-1"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/5 py-4 space-y-2">
            {isHomePage && NAV_LINKS.map(link => (
              <a key={link.href} href={link.href} className="block text-sm text-white/70 hover:text-white py-2 transition-colors">{link.label}</a>
            ))}
            {session ? (
              <>
                <Link href="/dashboard" className="block text-sm text-white/70 hover:text-white py-2 transition-colors">Dashboard</Link>
                <Link href="/audit/new" className="block text-sm text-white/70 hover:text-white py-2 transition-colors">New audit</Link>
                <button type="button" onClick={handleSignOut} className="block w-full text-left text-white/70 hover:text-white text-sm py-2 transition-colors">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block text-sm text-white/70 hover:text-white py-2 transition-colors">Sign in</Link>
                <Link href="/audit/new" className="block text-sm bg-teal-600 hover:bg-teal-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-center">Start free</Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
