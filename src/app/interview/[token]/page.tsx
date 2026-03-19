'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function sbGet(table: string, params: Record<string, string>) {
  const url = new URL(`${SB_URL}/rest/v1/${table}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`${table} fetch failed`)
  const rows = await res.json()
  return Array.isArray(rows) ? rows[0] ?? null : rows
}

type Message = { role: 'assistant' | 'user'; content: string }

export const dynamic = 'force-dynamic'

export default function InterviewPage() {
  const { token } = useParams<{ token: string }>()
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [leadId, setLeadId] = useState('')
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [done, setDone] = useState(false)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [streamingReply, setStreamingReply] = useState('')

  const submitWithComment = async () => {
    setSubmitting(true)
    if (comment.trim()) {
      await fetch('/api/interviews/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, comment: comment.trim() }),
      }).catch(() => {})
    }
    setSubmitted(true)
    setSubmitting(false)
    setTimeout(() => { router.push(`/interview/${token}/complete`) }, 2000)
  }
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      try {
        const iv = await sbGet('interviews', {
          token: `eq.${token}`,
          select: 'lead_id,stakeholder_email',
          limit: '1',
        })
        if (!iv) { setError('Invalid or expired interview link.'); setLoading(false); return }
        if (iv.stakeholder_email) setEmail(iv.stakeholder_email)
        setLeadId(iv.lead_id ?? '')

        const lead = await sbGet('leads', {
          id: `eq.${iv.lead_id}`,
          select: 'org_name',
          limit: '1',
        })
        if (lead?.org_name) setOrgName(lead.org_name)

        // Load initial message (trigger first AI turn)
        const reply = await fetch('/api/interviews/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, messages: [] }),
        })
        const data = await reply.json()
        if (data.reply) setMessages([{ role: 'assistant', content: data.reply }])
      } catch {
        setError('Failed to load interview. Please try again.')
        setLoading(false)
      }
      setLoading(false)
    }
    init()
  }, [token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingReply, thinking, done])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const send = async () => {
    if (!input.trim() || thinking || done) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const updated: Message[] = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setThinking(true)
    setStreamingReply('')

    try {
      const res = await fetch('/api/interviews/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, messages: updated, stream: true }),
      })

      if (!res.ok) throw new Error('Request failed')

      const contentType = res.headers.get('content-type') ?? ''
      const isStream = contentType.includes('text/event-stream') || contentType.includes('text/plain') || contentType.includes('x-ndjson')

      if (isStream && res.body) {
        // Streaming SSE path
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let accumulated = ''

        while (true) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') break
            try {
              const parsed = JSON.parse(payload)
              // Vercel AI SDK format: { type: "text-delta", textDelta: "..." }
              if (parsed.type === 'text-delta' && parsed.textDelta) {
                accumulated += parsed.textDelta
                setStreamingReply(accumulated)
              }
              // isDone signal from server
              if (parsed.isDone) {
                setDone(true)
                setStreamingReply('')
                break
              }
            } catch { /* skip non-JSON lines */ }
          }
        }

        setThinking(false)
        if (accumulated.trim()) {
          setMessages([...updated, { role: 'assistant', content: accumulated.trim() }])
          setStreamingReply('')
        }
      } else {
        // Fallback: non-streaming JSON response (also handles isDone: true path)
        setThinking(false)
        const data = await res.json()
        if (data.isDone) {
          // Interview complete — server signals completion with { reply: null, isDone: true }
          setDone(true)
        } else if (data.reply) {
          const final: Message[] = [...updated, { role: 'assistant', content: data.reply }]
          setMessages(final)
        }
      }
    } catch {
      setThinking(false)
      setMessages([...updated, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E1117]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading your interview…</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isInvalid = error.startsWith('Invalid or expired')
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E1117] px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-900/30 border border-red-800/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white font-semibold mb-2">{isInvalid ? 'Link unavailable' : 'Unable to load interview'}</p>
          <p className="text-slate-400 text-sm mb-5">
            {isInvalid
              ? 'This interview link has expired or is no longer valid. Please contact the person who sent you this link.'
              : error}
          </p>
          {isInvalid ? (
            <a
              href="/"
              className="block w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors"
            >
              Go to homepage
            </a>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E1117] flex flex-col">
      {/* Header */}
      <div className="bg-[#0E1117]/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Connai AI Interviewer</p>
          {orgName && (
            <p className="text-xs text-slate-500">
              {orgName}
              {' · '}
              Digital Maturity Assessment
            </p>
          )}
          {messages.length > 0 && (
            <p className="text-xs text-slate-600 mt-0.5">
              Question {Math.min(messages.filter(m => m.role === 'assistant').length, 10)} of ~10
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#0D5C63] text-white rounded-br-sm'
                  : 'bg-slate-800/80 text-slate-100 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming reply */}
        {streamingReply && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-slate-800/80 text-slate-100">
              {streamingReply}
              <span className="inline-block w-1 h-3.5 bg-teal-400 ml-0.5 animate-pulse rounded-sm" />
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {thinking && !streamingReply && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar or done state */}
      {done ? (
        <div className="bg-[#0E1117] border-t border-slate-800 px-4 py-6 flex-shrink-0">
          <div className="max-w-2xl mx-auto space-y-4">
            {submitted ? (
              <div className="text-center space-y-2">
                <div className="w-10 h-10 bg-teal-900/30 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-slate-200 font-semibold">Submitted — taking you to your summary…</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-slate-200 font-semibold">Interview complete</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Anything you&apos;d like to add before we finalise your input? (optional)
                  </p>
                </div>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Any additional context, clarifications, or priorities you want the assessment to consider…"
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={submitWithComment}
                    disabled={submitting}
                    className="flex-1 bg-[#0D5C63] hover:bg-[#0a4a50] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Submitting…' : 'Submit & view summary'}
                  </button>
                  {!comment.trim() && (
                    <button
                      type="button"
                      onClick={() => { setSubmitted(true); setTimeout(() => { router.push(`/interview/${token}/complete`) }, 800) }}
                      className="text-sm text-slate-500 hover:text-slate-300 px-3"
                    >
                      Skip
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#0E1117] border-t border-slate-800 px-4 py-3 flex-shrink-0">
          <div className="max-w-2xl mx-auto flex gap-3 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your answer..."
              rows={2}
              disabled={thinking}
              className="flex-1 resize-none bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 max-h-32 overflow-y-auto disabled:bg-slate-800"
            />
            <button
              type="button"
              aria-label="Send message"
              onClick={send}
              disabled={!input.trim() || thinking}
              className="w-10 h-10 bg-[#0D5C63] hover:bg-[#0a4a50] text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-600 text-center mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </div>
  )
}
