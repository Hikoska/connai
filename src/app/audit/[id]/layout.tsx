import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your AI Readiness Report | Connai',
  description:
    'View your personalised AI readiness audit results and recommendations.',
  robots: { index: false, follow: false },
}

export default function AuditIdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
