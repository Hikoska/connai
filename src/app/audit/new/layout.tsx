import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Start Your AI Readiness Audit | Connai',
  description:
    'Answer a few quick questions and get a personalised AI readiness report for your organisation — free, instant, and actionable.',
}

export default function AuditNewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
