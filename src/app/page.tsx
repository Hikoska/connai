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
  <section className="pt-32 pb-24 bg-[#F8F6F2]">
    <div className="max-w-4xl mx-auto px-6 text-center">
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
        <StartInterviewButton className="bg-[#0D5C63] text-white font-bold px-8 py-4 rounded-full hover:bg-[#0a4a50] transition-colors text-lg inline-flex items-center gap-2 shadow-lg shadow-teal-900/20">
          Start my free audit &rarr;
        </StartInterviewButton>
        <span className="text-sm text-gray-400">No consultant required. Free.</span>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500 border-t border-gray-200 pt-8">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900 font-mono">47</span>
          <span>audits completed</span>
        </div>
        <div className="hidden sm:block w-px h-6 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900 font-mono">30&thinsp;min</span>
          <span>average completion</span>
        </div>
        <div className="hidden sm:block w-px h-6 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900 font-mono">5</span>
          <span>dimensions scored</span>
        </div>
      </div>
    </div>
  </section>
)

const FinalCTA = () => (
  <section className="py-20 bg-[#0E1117] text-white">
    <div className="max-w-3xl mx-auto px-6 text-center">
      <h2 className={`${instrumentSerif.variable} font-serif text-4xl md:text-5xl font-bold mb-4`}>Ready to see where you stand?</h2>
      <p className="text-gray-400 text-lg mb-8">Free. 30 minutes. No consultant required.</p>
      <StartInterviewButton className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg shadow-teal-900/30">
        Get Your Free Report &rarr;
      </StartInterviewButton>
    </div>
  </section>
)

const Footer = () => (
  <footer className="bg-[#0E1117] text-gray-400 py-10 px-6">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center">
        {/* White pill ensures logo is visible on the dark footer background */}
        <div className="bg-white rounded-xl px-5 py-2.5">
          <Image
            src="/linkgrow-logo.png"
            alt="Linkgrow"
            width={200}
            height={56}
            className="h-10 w-auto object-contain"
          />
        </div>
      </div>
      <div className="flex gap-6 text-sm">
        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        <a href="mailto:hello@connai.io" className="hover:text-white transition-colors">Contact</a>
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
      <ProductScreenshot />
      <WhatYouGet />
      <WhoItsFor />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
      <FloatingAIWidget />
    </main>
  )
}
