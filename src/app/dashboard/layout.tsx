import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Dashboard | Connai',
  description: 'Manage your digital maturity audits and leads.',
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
