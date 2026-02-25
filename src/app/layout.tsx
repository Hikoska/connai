import type { Metadata } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { AlphaBanner } from '@/components/AlphaBanner'
import { FeedbackWidget } from '@/components/FeedbackWidget'
import { Navbar } from '@/components/Navbar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
})

const siteUrl = 'https://connai.linkgrow.io'
const siteTitle = 'Connai | AI Digital Maturity Audit'
const siteDescription =
  'Get a $10,000 digital maturity audit in days, not months. AI-powered interviews, structured reports, actionable insights.'
const ogImage = `${siteUrl}/api/og`

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Connai',
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Connai | AI Digital Maturity Audit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Connai',
  applicationCategory: 'BusinessApplication',
  description: "AI-powered digital maturity audits for SMEs. Get a clear picture of your organisation\'s digital health in minutes, not months.",
  url: 'https://connai.linkgrow.io',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${instrumentSerif.variable} font-sans bg-[#F8F6F2]`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navbar />
        <AlphaBanner />
        {children}
        <FeedbackWidget />
      </body>
    </html>
  )
}
