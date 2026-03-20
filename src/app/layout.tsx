import type { Metadata } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { AlphaBanner } from '@/components/AlphaBanner'
import { FeedbackWidget } from '@/components/FeedbackWidget'
import { Footer } from '@/components/Footer'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
})

export const metadata: Metadata = {
  title: 'Connai | AI Digital Maturity Audit',
  description: 'Get a $10,000 digital maturity audit in minutes, not months. AI-powered interviews, structured reports, actionable insights.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://connai.linkgrow.io' },
  openGraph: {
    title: 'Connai | AI Digital Maturity Audit',
    description: 'Get a $10,000 digital maturity audit in minutes, not months. AI-powered interviews, structured reports, actionable insights.',
    url: 'https://connai.linkgrow.io',
    siteName: 'Connai',
    images: [{ url: 'https://connai.linkgrow.io/api/og', width: 1200, height: 630, alt: 'Connai | AI Digital Maturity Audit' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connai | AI Digital Maturity Audit',
    description: 'Get a $10,000 digital maturity audit in minutes, not months. AI-powered interviews, structured reports, actionable insights.',
    images: ['https://connai.linkgrow.io/api/og'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${instrumentSerif.variable} font-sans bg-[#0D2738]`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-[#0D5C63] focus:text-white focus:font-semibold focus:rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none"
        >
          Skip to main content
        </a>
        <AlphaBanner />
        <Navbar />
        <main id="main-content">{children}</main>
        <Footer />
        <FeedbackWidget />
      </body>
    </html>
  )
}
