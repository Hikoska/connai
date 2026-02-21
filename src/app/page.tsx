import Link from 'next/link'
import { ChatInterface } from '@/components/ChatInterface'

const OPENING_MESSAGE = `When did you last get an honest picture of your organisation's digital health?`

export default function HomePage() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔭</span>
            <span className="font-bold text-teal-500 text-xl">Connai</span>
          </div>
          <div className="flex items-center">
            <Link href="/auth/login" className="text-gray-600 hover:text-teal-500 font-medium">
              Log in
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full max-w-3xl mx-auto py-8 px-4">
        <div className="w-full text-center mb-6">
          <h1 className="text-xl font-semibold text-gray-700">
            Understand where your organisation stands digitally — in 30 minutes.
          </h1>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-full flex-1 flex flex-col">
          <ChatInterface
            mode="brief"
            initialMessage={OPENING_MESSAGE}
            placeholder="Type your answer…"
          />
        </div>
      </main>
    </div>
  )
}
