import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up for Connai | AI Readiness Platform',
  description:
    'Create your free Connai account and start measuring your organisation's AI readiness today.',
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
