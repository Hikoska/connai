import { Instrument_Serif } from 'next/font/google'
import { FloatingAIWidget } from '@/components/FloatingAIWidget'
import { CTAButton } from '@/components/CTAButton'
import Link from 'next/link'
import Image from 'next/image'
import { SocialProof } from '@/components/SocialProof'
import { HowItWorks } from '@/components/HowItWorks'
import { WhatYouGet } from '@/components/WhatYouGet'
import { WhoItsFor } from '@/components/WhoItsFor'
import { ProductScreenshot } from '@/components/ProductScreenshot'
import { Testimonials } from '@/components/Testimonials'
import { FAQ } from '@/components/FAQ'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
})

const Hero = () => (
  <section className="min-h-screen flex items-center justify-center">
    <div className="max-w-3xl mx-auto px-4 text-center">
      <h1 className={`${instrumentSerif.variable} font-serif text-5xl md:text-7xl font-bold leading-tight mb-8`}>
        Get an honest picture of your organisation&apos;s digital health.
      </h1>
      <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
        Connai conducts an AI-powered digital maturity audit in 30 minutes, not months.
        Understand your gaps, benchmark against competitors, and get a clear action plan.
      </p>
      <CTAButton className="bg-[#0D5C63] text-white font-bold px-10 py-4 rounded-lg hover:opacity-90 transition-opacity text-lg" />
      <p className="mt-10 text-sm text-gray-500">
        Trusted by leading teams in Mauritius
      </p>
    </div>
  </section>
)

const FinalCTA = () => (
  <section className="py-20 bg-[#0E1117] text-white">
    <div className="max-w-3xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold font-serif mb-4">Ready to see where you stand?</h2>
      <p className="text-gray-300 text-lg mb-8">30 minutes. Full picture.</p>
      <CTAButton className="bg-teal-500 text-white font-bold px-8 py-4 rounded-lg hover:bg-teal-400 transition-colors text-lg" />
    </div>
  </section>
)

const LinkgrowMark = () => (
  <a
    href="https://linkgrow.io"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors group"
    title="Powered by Linkgrow"
  >
    <Image
      src="/linkgrow-logo.png"
      alt="Linkgrow"
      width={20}
      height={20}
      className="opacity-60 group-hover:opacity-100 transition-opacity"
    />
    <span className="text-xs">
      Powered by{' '}
      <span className="font-semibold text-gray-300 group-hover:text-white transition-colors">Linkgrow</span>
    </span>
  </a>
)

const Footer = () => (
  <footer className="bg-[#0E1117] text-gray-400 py-8 px-4 border-t border-gray-800">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-label="brain">🧠</span>
        <span className="font-bold text-white">Connai</span>
      </div>
      <LinkgrowMark />
      <div className="flex items-center gap-4 text-sm">
        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        <span className="text-gray-700">&middot;</span>
        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        <span className="text-gray-700">&middot;</span>
        <span>&copy; 2026 Linkgrow Ltd</span>
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
