import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Assessments | Connai',
  description: 'Connai admin assessments panel.',
  robots: { index: false, follow: false },
}

export default function AdminAssessmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
