import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Connai',
  description:
    'Read the Connai privacy policy to understand how we collect, use, and protect your data.',
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
