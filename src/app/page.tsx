import { Instrument_Serif } from 'next/font/google'
import dynamic from 'next/dynamic'
import { StartInterviewButton } from '@/components/StartInterviewButton'
import { SocialProof } from '@/components/SocialProof'
import Image from 'next/image'
import Link from 'next/link'

// ─── Above-fold: eager ────────────────────────────────────────────────────────
// Hero, SocialProof, and StartInterviewButton load immediately.
// SocialProof is kept eager: it appears just below the fold and carries
// trust-signal data that benefits from early fetch.

// ─── Below-fold: lazy-loaded ──────────────────────────────────────────────────
// All components below the first viewport are wrapped with Next.js dynamic()
// so their JS chunks are deferred until after the critical path renders.
// ssr:false is set on components that use client-only APIs (localStorage,
// usePathname, useChat) or heavy third-party hooks (ai/react).

const HowItWorks = dynamic(
  () => import('@/components/HowItWorks').then(m => ({ default: m.HowItWorks })),
  {
    loading: () => <SectionSkeleton height="h-64" />,
    ssr: false,
  }
)

const ProductScreenshot = dynamic(
  () => import('@/components/ProductScreenshot').then(m => ({ default: m.ProductScreenshot })),
  {
    loading: () => <SectionSkeleton height="h-80" />,
    ssr: false,
  }
)

const WhatYouGet = dynamic(
  () => import('@/components/WhatYouGet').then(m => ({ default: m.WhatYouGet })),
  {
    loading: () => <SectionSkeleton height="h-64" />,
    ssr: false,
  }
)

const WhoItsFor = dynamic(
  () => import('@/components/WhoItsFor').then(m => ({ default: m.WhoItsFor })),
  {
    loading: () => <SectionSkeleton height="h-64" />,
    ssr: false,
  }
)

const Testimonials = dynamic(
  () => import('@/components/Testimonials').then(m => ({ default: m.Testimonials })),
  {
    loading: () => <SectionSkeleton height="h-48" />,
    ssr: false,
  }
)

const FAQ = dynamic(
  () => import('@/components/FAQ').then(m => ({ default: m.FAQ })),
  {
    loading: () => <SectionSkeleton height="h-64" />,
    ssr: false,
  }
)

// FloatingAIWidget: highest priority lazy-load.
// Uses useChat (ai/react), useRouter, SSE streaming — heaviest client bundle
// on the homepage. ssr:false ensures it never blocks the server render.
const FloatingAIWidget = dynamic(
  () => import('@/components/FloatingAIWidget').then(m => ({ default: m.FloatingAIWidget })),
  {
    loading: () => null,
    ssr: false,
  }
)

// HomeConcierge: role-personalisation widget.
// Uses localStorage, usePathname, and client-side state — client-only.
const HomeConcierge = dynamic(
  () => import('@/components/HomeConcierge'),
  {
    loading: () => null,
    ssr: false,
  }
)

// ─── Skeleton placeholder ─────────────────────────────────────────────────────
// Minimal skeleton to prevent layout shift during lazy-load hydration.
// Uses the same background as the page so there is no flash of white.
function SectionSkeleton({ height = 'h-48' }: { height?: string }) {
  return (
    <div
      className={`w-full ${height} bg-[#0D2738] animate-pulse`}
      aria-hidden="true"
      role="presentation"
    />
  )
}

// ─── Font ─────────────────────────────────────────────────────────────────────
// Note: Instrument_Serif is also loaded in layout.tsx (global). This local
// instance provides the CSS variable for Hero & FinalCTA which are inlined
// in this file. next/font deduplicates the network request automatically.
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
})

// ─── Inline components (tiny, no heavy deps) ─────────────────────────────────

const Hero = () => (
  <section className="relative pt-24 pb-16 overflow-hidden bg-[#0D2738]">
    {/* Teal depth gradient */}
    <div className="absolute inset-0 bg-gradient-to-b from-[#0D5C63]/10 to-transparent pointer-events-none" />
    {/* Subtle dot pattern */}
    <div
      className="absolute inset-0 pointer-events-none opacity-40"
      style={{ backgroundImage: 'radial-gradient(#0D5C6330 1px, transparent 1px)', backgroundSize: '20px 20px' }}
    />
    <div className="relative max-w-4xl mx-auto px-6 text-center">
      <div className="inline-flex items-center gap-2 bg-teal-900/30 text-teal-300 text-sm font-medium px-3 py-1 rounded-full mb-8 border border-teal-700/50">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
        Beta &middot; Free
      </div>
      <h1 className={`${instrumentSerif.variable} font-serif text-5xl md:text-7xl font-bold leading-[1.1] mb-6 text-white`}>
        Know exactly where your organization stands &mdash; within a concise 45-minute audit.
      </h1>
      <p className="text-xl text-white/70 mb-10 leading-relaxed max-w-2xl mx-auto">
        Connai runs an AI-powered digital maturity audit and delivers a scored report your leadership team can act on.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <StartInterviewButton className="bg-[#0D5C63] text-white font-bold px-8 py-4 rounded-full hover:bg-[#0a4a50] transition-colors text-lg inline-flex items-center gap-2 shadow-lg shadow-teal-900/20 animate-pulse">
          Start a free audit &rarr;
        </StartInterviewButton>
        <span className="text-sm text-white/60">No consultant required. Free.</span>
      </div>
      <div className="border border-teal-700/30 rounded-xl px-8 py-5 bg-slate-900/70 backdrop-blur-sm inline-flex">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white font-mono">45-minute</span>
            <span>average completion</span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-slate-600" />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white font-mono">8</span>
            <span>dimensions scored</span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-slate-600" />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white font-mono">100%</span>
            <span>AI-driven</span>
          </div>
        </div>
      </div>
    </div>
  </section>
)

const FinalCTA = () => (
  <section className="py-16 bg-[#0D5C63] text-white">
    <div className="max-w-3xl mx-auto px-6 text-center">
      <h2 className={`${instrumentSerif.variable} font-serif text-4xl md:text-5xl font-bold mb-4`}>Ready to see where you stand?</h2>
      <p className="text-gray-100 text-lg mb-8">Free. 30 minutes. No consultant required.</p>
      <StartInterviewButton className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg shadow-teal-900/20">
        Get Your Free Report &rarr;
      </StartInterviewButton>
    </div>
  </section>
)

const Footer = () => (
  <footer className="bg-[#0D2738] text-white/60 py-8 px-6 border-t border-teal-900/50">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-4">
        <span className="text-xs text-white/40">&copy; 2026 Connai</span>
        <span className="text-white/20">|</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 uppercase tracking-widest font-medium">Built by</span>
        <div className="bg-white rounded px-2 py-1">
          <Image src="/linkgrow-logo.png" alt="Linkgrow" width={72} height={18} className="object-contain" />
        </div>
      </div>
      <div className="flex gap-6 text-sm">
        <Link href="/privacy" className="text-gray-600 underline decoration-gray-300 hover:text-gray-900 hover:decoration-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C63] rounded-sm">Privacy</Link>
        <Link href="/terms" className="text-gray-600 underline decoration-gray-300 hover:text-gray-900 hover:decoration-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C63] rounded-sm">Terms</Link>
        <a href="mailto:hello@connai.io" className="text-gray-600 underline decoration-gray-300 hover:text-gray-900 hover:decoration-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C63] rounded-sm">Contact</a>
      </div>
    </div>
  </footer>
)

export const metadata = {
  title: "Connai — AI-Powered Digital Maturity Audits",
  description: "Connai helps African SMEs understand and improve their digital maturity with AI-powered audits and actionable recommendations.",
};

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* ── Above fold: eager ─────────────────────────── */}
      <Hero />
      <SocialProof />

      {/* ── Below fold: lazy-loaded ───────────────────── */}
      <HowItWorks />
      <section className="relative rounded-2xl overflow-hidden">
        <ProductScreenshot />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0D5C6315,transparent_70%)] pointer-events-none" />
      </section>
      <WhatYouGet />
      <WhoItsFor />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />

      {/* ── Client-only widgets: no SSR ───────────────── */}
      <FloatingAIWidget />
      <HomeConcierge />
    </main>
  )
}
