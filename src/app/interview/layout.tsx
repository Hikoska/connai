import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Interview | Connai',
  description: 'Your AI-powered digital maturity interview.',
}

export default function InterviewLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
