import { ChatInterface } from '@/components/ChatInterface'
import Link from 'next/link'

export const metadata = {
  title: 'Digital Maturity Interview — Connai',
}

interface Props {
  params: { id: string }
}

export default function InterviewPage({ params }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🔭</span>
            <span className="font-bold text-teal-500 text-lg">Connai</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Interview in progress</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Digital Maturity Assessment
            </h1>
            <p className="text-gray-400 text-xs">
              Session {params.id} · Confidential · ~15 minutes
            </p>
          </div>

          <ChatInterface
            mode="interview"
            initialMessage="Hello! I'm Connai's AI interview specialist. I'm here to conduct a brief digital maturity assessment as part of your organisation's audit. Your responses are confidential and will inform the leadership report. This should take around 15 minutes. Ready to begin?"
            placeholder="Type your response…"
          />

          <p className="text-center text-xs text-gray-400 mt-4">
            Your responses are recorded securely and shared only with your organisation&apos;s leadership.
          </p>
        </div>
      </main>
    </div>
  )
}
