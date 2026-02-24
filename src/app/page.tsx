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

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
})

const Hero = () => (
  <section className="pt-32 pb-20 bg-[#F8F6F2]">
    <div className="max-w-4xl mx-auto px-6 text-center">
      <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-sm font-medium px-3 py-1 rounded-full mb-6 border border-teal-100">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
        Beta &middot; Mauritius
      </div>
      <h1 className={`${instrumentSerif.variable} font-serif text-6xl md:text-7xl font-bold leading-[1.1] mb-6 text-gray-900`}>
        Get an honest picture of your organisation&apos;s digital health.
      </h1>
      <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-xl mx-auto">
        Connai conducts an AI-powered digital maturity audit in minutes, not months.
      </p>
      <StartInterviewButton className="bg-[#0D5C63] text-white font-bold px-8 py-4 rounded-full hover:bg-[#0a4a50] transition-colors text-lg inline-flex items-center gap-2">
        Start my free audit &#8594;
      </StartInterviewButton>
      <div className="mt-8 text-sm text-gray-400">
        Trusted by leading teams in Mauritius
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
      <div className="flex items-center gap-3">
        <Image
          src="/linkgrow-logo.png"
          alt="Linkgrow"
          width={100}
          height={28}
          className="h-7 w-auto brightness-0 invert opacity-70"
        />
        <span className="text-gray-600 text-xs">Powered by Linkgrow</span>
      </div>
      <div className="text-sm">
        <Link href="/privacy" className="hover:text-white">Privacy</Link> &middot; <Link href="/terms" className="hover:text-white">Terms</Link>
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
