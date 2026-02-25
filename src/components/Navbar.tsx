'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StartInterviewButton } from '@/components/StartInterviewButton'

// Connai logomark — geometric neural-node mark
// Central hub + 3 satellite nodes: represents AI connecting inputs to structured insight
const ConnaiMark = ({ size = 28, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="connai-g1" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0D5C63" />
        <stop offset="100%" stopColor="#0ab8ca" />
      </linearGradient>
    </defs>
    {/* Connector lines */}
    <line x1="7.2" y1="7.5" x2="12.2" y2="12.2" stroke="url(#connai-g1)" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
    <line x1="20.8" y1="7.5" x2="15.8" y2="12.2" stroke="url(#connai-g1)" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
    <line x1="14" y1="17" x2="14" y2="21.5" stroke="url(#connai-g1)" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
    {/* Satellite nodes */}
    <circle cx="5.5" cy="6" r="2.2" fill="url(#connai-g1)" opacity="0.8" />
    <circle cx="22.5" cy="6" r="2.2" fill="url(#connai-g1)" opacity="0.8" />
    <circle cx="14" cy="23.5" r="2.2" fill="url(#connai-g1)" opacity="0.8" />
    {/* Central hub */}
    <circle cx="14" cy="14" r="3.2" fill="url(#connai-g1)" />
    {/* Inner pulse ring — 4IR detail */}
    <circle cx="14" cy="14" r="1.4" fill="white" opacity="0.45" />
  </svg>
)

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
      <nav className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo — SVG mark + gradient wordmark */}
        <Link href="/" className="flex items-center gap-2 group">
          <ConnaiMark
            size={28}
            className="transition-transform duration-300 group-hover:scale-110 drop-shadow-sm"
          />
          <span
            className="text-xl font-bold tracking-tight select-none"
            style={{
              background: 'linear-gradient(135deg, #0D5C63 0%, #0ab8ca 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Connai
          </span>
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
