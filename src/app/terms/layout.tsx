import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Connai',
  description:
    'Review the Connai terms of service governing your use of the AI readiness platform.',
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
