import Link from 'next/link'
import { ChatInterface } from '@/components/ChatInterface'

// force-dynamic: server renders fresh on every request
// Math.random() runs server-side each load → different question each refresh
// Future: replace with weighted A/B selection from Supabase once visit tracking is live
export const dynamic = 'force-dynamic'

const OPENING_QUESTIONS = [
  "When did you last get an honest picture of your organisation's digital health?",
  "How confident are you that your team is using technology as well as your top competitors?",
  "On a scale of 1\u201310 \u2014 how would you rate your organisation's digital maturity right now?",
  "If a client asked how digitally advanced your organisation is \u2014 what would you say?",
  "What\u2019s the one area where digital could have the biggest impact in your organisation?",
  "Is your organisation\u2019s tech keeping up with how your customers behave today?",
  "Where do you think you\u2019re losing the most ground digitally \u2014 operations, customers, or team?",
  "How much of your organisation\u2019s potential are you actually unlocking through technology?",
]

export default function HomePage() {
  // Server-side pick: fresh on every request (force-dynamic ensures no caching)
  const openingQuestion = OPENING_QUESTIONS[Math.floor(Math.random() * OPENING_QUESTIONS.length)]

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">\uD83D\uDD2D</span>
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
            Understand where your organisation stands digitally \u2014 in 30 minutes.
          </h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-full flex-1 flex flex-col">
          <ChatInterface
            mode="brief"
            initialMessage={openingQuestion}
            placeholder="Type your answer\u2026"
          />
        </div>
      </main>
    </div>
  )
}
