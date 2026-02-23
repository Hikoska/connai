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

const Hero = () => (
  <section className="min-h-screen flex items-center justify-center">
    <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto px-4">
      <div className="text-left">
        <h1 className={`${instrumentSerif.variable} font-serif text-5xl md:text-6xl font-bold leading-tight mb-6`}>
          Get an honest picture of your organisation's digital health.
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Connai conducts an AI-powered digital maturity audit in minutes, not months.
        </p>
        <StartInterviewButton className="bg-[#0D5C63] text-white font-bold px-8 py-4 rounded-lg hover:opacity-90 transition-opacity text-lg">
          Start my free audit →
        </StartInterviewButton>
        <div className="mt-12 text-sm text-gray-500">
          Trusted by leading teams in Mauritius
        </div>
      </div>
      <div className="hidden md:block">
        {/* The static placeholder has been removed as per QA feedback */}
      </div>
    </div>
  </section>
)

const FinalCTA = () => (
  <section className="py-20 bg-[#0E1117] text-white">
    <div className="max-w-3xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold font-serif mb-4">Ready to see where you stand?</h2>
      <p className="text-gray-300 text-lg mb-8">30 minutes. Full picture.</p>
      <StartInterviewButton className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 px-10 rounded-full text-lg transition-colors">
        Start Your Free Assessment
      </StartInterviewButton>
    </div>
  </section>
)

const Footer = () => (
  <footer className="bg-gray-900 text-gray-400 py-8 px-4">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">🤕</span>
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
