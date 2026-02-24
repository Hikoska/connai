'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { StartInterviewButton } from '@/components/StartInterviewButton'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
    }`}>
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/linkgrow-logo.png"
            alt="Linkgrow"
            width={120}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            How it works
          </a>
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Sign in
          </Link>
          <StartInterviewButton className="bg-[#0D5C63] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#0a4a50] transition-colors">
            Start free audit
          </StartInterviewButton>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-gray-800 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-gray-800 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-gray-800 transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-4">
          <a href="#how-it-works" className="block text-sm text-gray-700" onClick={() => setMenuOpen(false)}>How it works</a>
          <Link href="/auth/login" className="block text-sm text-gray-700" onClick={() => setMenuOpen(false)}>Sign in</Link>
          <StartInterviewButton className="w-full bg-[#0D5C63] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#0a4a50] transition-colors text-center block">
            Start free audit
          </StartInterviewButton>
        </div>
      )}
    </header>
  )
}
