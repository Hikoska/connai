import { ChatInterface } from '@/components/ChatInterface'
import Link from 'next/link'

export const metadata = {
  title: 'Set up your audit — Connai',
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-white flex flex-col">
      <header className="bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔭</span>
            <span className="font-bold text-teal-500 text-xl">Connai</span>
          </Link>
          <span className="text-sm text-gray-400">Free audit setup</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              ✨ Your free audit includes 1 AI interview
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Let&apos;s set up your audit
            </h1>
            <p className="text-gray-500 text-sm">
              Answer a few questions and your digital maturity audit will be configured in minutes.
            </p>
          </div>

          <ChatInterface
            mode="brief"
            initialMessage="Hi! I'm Connai's briefing assistant. I'm here to configure your organisation's digital maturity audit — it'll take about 3 minutes. To start: what's the name of your organisation, and what industry are you in?"
            placeholder="Type your answer…"
          />

          <p className="text-center text-xs text-gray-400 mt-4">
            No credit card required · Your responses are kept confidential
          </p>
        </div>
      </main>
    </div>
  )
}
