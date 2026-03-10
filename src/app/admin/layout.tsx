import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin | Connai',
  description: 'Connai admin panel.',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
