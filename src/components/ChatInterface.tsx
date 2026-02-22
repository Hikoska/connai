'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef, useState } from 'react'

// Question pool lives in page.tsx (server component, force-dynamic).
// ChatInterface just receives the pre-selected question as a prop.
// This eliminates the hydration mismatch from client-side Math.random().
// A/B tracking: log initialMessage + engagement to Supabase on first user reply.

interface ChatInterfaceProps {
  mode: 'brief' | 'interview'
  initialMessage: string
  placeholder?: string
}

const CAPTURE_TAG_RE = /<CONNAI_CAPTURE>([\s\S]*?)<\/CONNAI_CAPTURE>/

function stripCaptureTag(content: string): string {
  return content.replace(CAPTURE_TAG_RE, '').trim()
}

export function ChatInterface({ mode, initialMessage, placeholder }: ChatInterfaceProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: { mode },
    initialMessages: [
      { id: 'init', role: 'assistant', content: initialMessage },
    ],
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [started, setStarted] = useState(false)
  const [captureState, setCaptureState] = useState<'idle' | 'capturing' | 'captured' | 'error'>('idle')
  const [capturedEmail, setCapturedEmail] = useState('')
  const captureAttempted = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, captureState])

  useEffect(() => {
    if (!isLoading && started) inputRef.current?.focus()
  }, [isLoading, started])

  // Detect CONNAI_CAPTURE tag after streaming completes (interview mode only)
  useEffect(() => {
    if (isLoading || captureAttempted.current || mode !== 'interview') return
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') return
    const match = lastMsg.content.match(CAPTURE_TAG_RE)
    if (!match) return

    captureAttempted.current = true

    let data: { org: string; industry: string; role: string; email: string }
    try {
      data = JSON.parse(match[1])
    } catch {
      return
    }
    if (!data.email) return

    setCapturedEmail(data.email)
    setCaptureState('capturing')

    fetch('/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then((r) => r.json())
      .then((res) => {
        setCaptureState(res.success ? 'captured' : 'error')
      })
      .catch(() => setCaptureState('error'))
  }, [isLoading, messages, mode])

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden" style={{ height: '580px' }}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-teal-500 to-teal-600">
        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-white text-lg">🔭</span>
        </div>
        <div>
          <div className="text-white font-semibold text-sm">Connai AI</div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-300 rounded-full"></div>
            <span className="text-teal-100 text-xs">
              {mode === 'brief' ? 'Briefing assistant' : 'Interview specialist'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-0.5">
                C
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-teal-500 text-white rounded-br-sm'
                  : 'bg-gray-50 text-gray-800 rounded-bl-sm border border-gray-100'
              }`}
            >
              {stripCaptureTag(m.content)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              C
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-bl-sm px-4 py-3 border border-gray-100">
              <div className="flex gap-1 items-center h-4">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Capture success card */}
        {captureState === 'captured' && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-0.5">
              C
            </div>
            <div className="max-w-[78%] bg-teal-50 border border-teal-200 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-teal-700 text-xs font-semibold">Audit registered</span>
              </div>
              <p className="text-teal-800 text-xs leading-relaxed">
                Interview link will be sent to{' '}
                <span className="font-medium">{capturedEmail}</span>.
              </p>
            </div>
          </div>
        )}

        {error && captureState === 'idle' && (
          <div className="text-center">
            <span className="text-xs text-red-400 bg-red-50 px-3 py-1.5 rounded-full">
              Connection issue — please try again
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — hidden after successful capture */}
      {captureState !== 'captured' && (
        <form
          onSubmit={(e) => { setStarted(true); handleSubmit(e) }}
          className="px-4 py-4 border-t border-gray-100 bg-white"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder={placeholder || 'Type your answer…'}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400 transition"
              disabled={isLoading || captureState === 'capturing'}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || captureState === 'capturing'}
              className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl w-10 h-10 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
