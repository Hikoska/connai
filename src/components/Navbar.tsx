'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const ConnaiMark = ({ size = 28, className = '' }: { size?: number; className?: string }) => (
  <svg width={Math.round(size * 1.14)} height={size} viewBox="0 0 32 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <rect x="1" y="16" width="8" height="12" rx="4" fill="#0ab8ca" />
    <rect x="12" y="8" width="8" height="20" rx="4" fill="#0791a0" />
    <rect x="23" y="1" width="8" height="27" rx="4" fill="#0D5C63" />
  </svg>
)

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
        const { data: { session } } = await sb.auth.getSession()
        setIsLoggedIn(!!session)
      } catch {}
    }
    checkAuth()
  }, [pathname])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await sb.auth.signOut()
      setIsLoggedIn(false)
      setIsAccountOpen(false)
      router.push('/')
    } catch {}
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
      isScrolled ? 'bg-[#0D2738]/95 backdrop-blur-md shadow-lg shadow-black/20' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <Link href="/#how-it-works" className="text-white/70 hover:text-white text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded">
              How it works
            </Link>

            {isLoggedIn ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                  className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
                  aria-expanded={isAccountOpen}
                  aria-haspopup="true"
                >
                  <span className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">L</span>
                </button>
                {isAccountOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-[#0D2738] border border-white/10 rounded-lg shadow-xl py-1 z-50">
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5" onClick={() => setIsAccountOpen(false)}>Dashboard</Link>
                    <button type="button" onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5">Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/login" className="text-sm text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded">
                Sign in
              </Link>
            )}

            {/* FIXED: was href='#' — now navigates to /audit/new */}
            <Link
              href="/audit/new"
              className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1117]"
            >
              Start free audit
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded p-1"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/10 py-4 space-y-3">
            <Link href="/#how-it-works" className="block text-white/70 hover:text-white text-sm transition-colors py-2" onClick={() => setIsMenuOpen(false)}>How it works</Link>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="block text-white/70 hover:text-white text-sm py-2" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                <button type="button" onClick={handleSignOut} className="block w-full text-left text-white/70 hover:text-white text-sm py-2">Sign out</button>
              </>
            ) : (
              <Link href="/auth/login" className="block text-white/70 hover:text-white text-sm py-2" onClick={() => setIsMenuOpen(false)}>Sign in</Link>
            )}
            {/* FIXED: was href='#' on mobile too */}
            <Link
              href="/audit/new"
              className="block bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              Start free audit
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
