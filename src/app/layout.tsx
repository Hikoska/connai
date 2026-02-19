import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Linkgrow Lense — AI Digital Maturity Audits',
  description: 'Get a $10,000 digital maturity audit in days, not months. AI-powered interviews, structured reports, actionable insights.',
  openGraph: {
    title: 'Linkgrow Lense',
    description: 'AI-powered digital maturity audits at 42% of consultant cost.',
    url: 'https://lense.linkgrow.io',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
