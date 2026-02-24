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

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
})

const HeroMockup = () => (
  <div className="relative">
    <div className="bg-[#0E1117] rounded-2xl shadow-2xl p-6 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Digital Maturity Report</p>
          <p className="text-white font-semibold">Acme Corp — Feb 2026</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-white">68</div>
          <div className="text-teal-400 text-xs">/100 overall</div>
        </div>
      </div>
      {/* Score bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full" style={{width: '68%'}} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-gray-500 text-xs">0</span>
          <span className="text-teal-400 text-xs">↑ +9 vs Mauritius median</span>
          <span className="text-gray-500 text-xs">100</span>
        </div>
      </div>
      {/* Dimensions */}
      <div className="space-y-3">
        {[
          { label: 'Technology Infrastructure', score: 64, color: 'bg-teal-500' },
          { label: 'Data & Analytics', score: 71, color: 'bg-teal-400' },
          { label: 'Process Automation', score: 58, color: 'bg-teal-600' },
          { label: 'Digital Culture', score: 79, color: 'bg-teal-300' },
        ].map(d => (
          <div key={d.label}>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400 text-xs">{d.label}</span>
              <span className="text-white text-xs font-medium">{d.score}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full ${d.color} rounded-full`} style={{width: `${d.score}%`}} />
            </div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between">
        <span className="text-gray-600 text-xs">Powered by Connai</span>
        <span className="text-teal-500 text-xs font-medium">View full report →</span>
      </div>
    </div>
    {/* Glow effect */}
    <div className="absolute inset-0 rounded-2xl bg-teal-500/5 blur-xl -z-10" />
  </div>
)

const Hero = () => (
  <section className="pt-32 pb-20 bg-[#F8F6F2]">
    <div className="grid md:grid-cols-2 gap-12 items-center max-w-7xl mx-auto px-6">
      <div className="text-left">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-sm font-medium px-3 py-1 rounded-full mb-6 border border-teal-100">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          Beta · Mauritius
        </div>
        <h1 className={`${instrumentSerif.variable} font-serif text-6xl md:text-7xl font-bold leading-[1.1] mb-6 text-gray-900`}>
          Get an honest picture of your organisation&apos;s digital health.
        </h1>
        <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
          Connai conducts an AI-powered digital maturity audit in minutes, not months.
        </p>
        <StartInterviewButton className="bg-[#0D5C63] text-white font-bold px-8 py-4 rounded-full hover:bg-[#0a4a50] transition-colors text-lg inline-flex items-center gap-2">
          Start my free audit →
        </StartInterviewButton>
        <div className="mt-8 text-sm text-gray-400">
          Trusted by leading teams in Mauritius
        </div>
      </div>
      <div className="hidden md:block">
        <HeroMockup />
      </div>
    </div>
  </section>
)

const FinalCTA = () => (
  <section className="py-20 bg-[#0E1117] text-white">
    <div className="max-w-3xl mx-auto px-6 text-center">
      <h2 className="text-4xl md:text-5xl font-bold font-serif mb-4">Ready to see where you stand?</h2>
      <p className="text-gray-300 text-lg mb-8">30 minutes. Full picture.</p>
      <StartInterviewButton className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 px-10 rounded-full text-lg transition-colors">
        Start Your Free Assessment
      </StartInterviewButton>
    </div>
  </section>
)

const Footer = () => (
  <footer className="bg-[#0E1117] text-gray-400 py-8 px-6">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="font-bold text-white">Connai</span>
      </div>
      <div className="text-sm">
        <Link href="/privacy" className="hover:text-white">Privacy</Link> · <Link href="/terms" className="hover:text-white">Terms</Link>
      </div>
    </div>
  </footer>
)

export default function LandingPage() {
  return (
    <div className="bg-[#F8F6F2] text-gray-800">
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <WhatYouGet />
        <WhoItsFor />
        <ProductScreenshot />
        <Testimonials />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>
      <FloatingAIWidget />
    </div>
  )
}
