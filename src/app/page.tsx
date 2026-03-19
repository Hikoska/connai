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
import Image from 'next/image'
import Link from 'next/link'
import HomeConcierge from '@/components/HomeConcierge'

const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-instrument-serif' })

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  'name': 'Connai',
  'url': 'https://connai.linkgrow.io',
  'applicationCategory': 'BusinessApplication',
  'operatingSystem': 'Web',
  'description': 'AI-powered digital maturity audit. Get a scored report across 8 dimensions in 20 minutes.',
  'offers': {
    '@type': 'Offer',
    'price': '0',
    'priceCurrency': 'USD',
    'description': 'Free digital maturity assessment',
  },
  'publisher': {
    '@type': 'Organization',
    'name': 'Connai',
    'url': 'https://connai.linkgrow.io',
  },
}

const Hero = () => (
  <section className="relative pt-24 pb-16 overflow-hidden bg-[#0D2738]">
    <div className="absolute inset-0 bg-gradient-to-b from-[#0D5C63]/10 to-transparent pointer-events-none" />
    <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: 'radial-gradient(#0D5C6330 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
    <div className="relative max-w-4xl mx-auto px-6 text-center">
      <div className="inline-flex items-center gap-2 bg-teal-900/30 text-teal-300 text-sm font-medium px-3 py-1 rounded-full mb-8 border border-teal-700/50">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
        Beta &middot; Free
      </div>
      <h1 className={`${instrumentSerif.variable} font-serif text-5xl md:text-7xl font-bold leading-[1.1] mb-6 text-white`}>
        Know exactly where your organization stands &mdash; within a concise 20-minute audit.
      </h1>
      <p className="text-xl text-white/70 mb-10 leading-relaxed max-w-2xl mx-auto">
        Connai runs an AI-powered digital maturity audit and delivers a scored report your leadership team can act on.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <StartInterviewButton className="bg-[#0D5C63] text-white font-bold px-8 py-4 rounded-full hover:bg-[#0a4a50] transition-all text-lg inline-flex items-center gap-2 shadow-lg shadow-teal-900/40 ring-2 ring-teal-500/20 hover:ring-teal-500/40">
          Start a free audit &rarr;
        </StartInterviewButton>
        <span className="text-sm text-white/60">No consultant required &middot; Results in minutes</span>
      </div>
      <SocialProof />
    </div>
  </section>
)

export default function HomePage() {
  return (
    <main id="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <HowItWorks />
      <WhatYouGet />
      <ProductScreenshot />
      <WhoItsFor />
      <Testimonials />
      <FAQ />
      <section className="py-16 bg-[#0D2738] text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className={`${instrumentSerif.variable} font-serif text-4xl text-white mb-4`}>Ready to see where you stand?</h2>
          <p className="text-white/60 mb-8">Free. No setup. Results in 20 minutes.</p>
          <StartInterviewButton className="bg-[#0D5C63] text-white font-bold px-8 py-4 rounded-full hover:bg-[#0a4a50] transition-colors text-lg inline-flex items-center gap-2">
            Start your free audit &rarr;
          </StartInterviewButton>
        </div>
      </section>
      <FloatingAIWidget />
      <HomeConcierge />
      <footer className="bg-[#0D2738] border-t border-white/5 py-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-teal-400 font-bold text-sm">Connai</span>
            <span className="text-white/30 text-xs">&middot; AI-powered digital maturity audits</span>
          </div>
          <nav className="flex items-center gap-5 text-xs text-white/40">
            <Link href="/dashboard" className="hover:text-white/70 transition-colors">Dashboard</Link>
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
          </nav>
          <p className="text-white/30 text-xs">&copy; {new Date().getFullYear()} Connai. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
