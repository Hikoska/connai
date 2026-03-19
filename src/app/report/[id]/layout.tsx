import type { Metadata } from 'next'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'Digital Maturity Report | Connai',
    description:
      'View your personalised Digital Maturity Report — AI-generated scores across 8 dimensions with a prioritised action plan.',
    robots: { index: false, follow: false },
    openGraph: {
      title: 'Digital Maturity Report | Connai',
      description: 'AI-generated Digital Maturity Report — scores across 8 dimensions with a prioritised action roadmap.',
      siteName: 'Connai',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: 'Digital Maturity Report | Connai',
      description: 'AI-generated Digital Maturity Report — scores across 8 dimensions with a prioritised action roadmap.',
    },
  }
}

export default function ReportIdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
