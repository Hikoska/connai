import { Instrument_Serif } from 'next/font/google'
import { FloatingAIWidget } from '@/components/FloatingAIWidget'
import { StartInterviewButton } from '@/components/StartInterviewButton'
import { SocialProof } from '@/components/SocialProof'
import { HowItWorks } from '@/components/HowItWorks'
import { WhatYouGet } from '@/components/WhatYouGet'
import { WhoItsFor } from '@/components/WhoItsFor'
import { ProductScreenshot } from '@/components/ProductScreenshot'
import { Testimonials } from '@/components/Testimonials'
import { FAQ } from '@/components/FAQ'
import Link from 'next/link'
import HomeConcierge from '@/components/HomeConcierge'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
})

const Hero = () => (
  <section className="relative pt-24 pb-16 overflow-hidden bg-[#F8F6F2]">
    {/* Teal depth gradient */}
    <div className="absolute inset-0 bg-gradient-to-b from-[#0D5C63]/10 to-transparent pointer-events-none" />
    {/* Subtle dot pattern */}
    <div
      className="absolute inset-0 pointer-events-none opacity-40"
      style={{ backgroundImage: 'radial-gradient(#0D5C6330 1px, transparent 1px)', backgroundSize: '20px 20px' }}
    />
    <div className="relative max-w-4xl mx-auto px-6 text-center">
      <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-sm font-medium px-3 py-1 rounded-full mb-8 border border-teal-100">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
        Beta &middot; Free
      </div>
      <h1 className={`${instrumentSerif.variable} font-serif text-5xl md:text-7xl font-bold leading-[1.1] mb-6 text-gray-900`}>
        Know exactly where your organisation stands &mdash; in 30 minutes.
      </h1>
      <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl mx-auto">
        Connai runs an AI-powered digital maturity audit and delivers a scored report your leadership team can act on.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <StartInterviewButton className="bg-[#0D5C63] text-white font-bold px-8 py-4 rounded-full hover:bg-[#0a4a50] transition-colors text-lg inline-flex items-center gap-2 shadow-lg shadow-teal-900/20 animate-pulse">
          Start my free audit &rarr;
        </StartInterviewButton>
        <span className="text-sm text-gray-600">No consultant required. Free.</span>
      </div>
      <div className="border border-teal-700/30 rounded-xl px-8 py-5 bg-slate-900/70 backdrop-blur-sm inline-flex">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white font-mono">45&thinsp;min</span>
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
      <StartInterviewButton className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg shadow-teal-900/30">
        Get Your Free Report &rarr;
      </StartInterviewButton>
    </div>
  </section>
)

const Footer = () => (
  <footer className="bg-[#F8F6F2] text-gray-700 py-8 px-6 border-t border-gray-200">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500">&copy; 2026 Connai</span>
        <span className="text-gray-300">|</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 uppercase tracking-widest font-medium">Built by</span>
        <div className="bg-white rounded px-2 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/linkgrow-logo.png" alt="Linkgrow" style={{ height: '18px', width: 'auto', display: 'block' }} />
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

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <SocialProof />
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
      <FloatingAIWidget />
      <HomeConcierge />
    </main>
  )
}
