'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function sbFetch(table: string, filter: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
  })
  if (!res.ok) throw new Error(`${table} fetch failed`)
  return res.json()
}

type Message = { role: 'user' | 'assistant'; content: string }

export default function InterviewPage() {
  const { token } = useParams() as { token: string }
  const router    = useRouter()

  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [thinking,  setThinking]  = useState(false)
  const [done,      setDone]      = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const redirected = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [error, setError] = useState('')
  const [lastFailedMsg, setLastFailedMsg] = useState<string | null>(null)

  const [addlContext, setAddlContext] = useState('')
  const [submitted,   setSubmitted]   = useState(false)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  // Reset textarea height when input is cleared (e.g. after send)
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input])

  // Load interview
  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const supabase = createClient()
        supabase.from('interviews').update({ status: 'in_progress' }).eq('token', token).then(() => {})
        const [ivRows, msgRows] = await Promise.all([
          sbFetch('interviews', `token=eq.${token}&select=id,status,lead_id`),
          sbFetch('interview_messages', `interview_token=eq.${token}&select=role,content&order=created_at.asc`),
        ])
        const iv = ivRows?.[0]
        if (!iv) { setError('Invalid or expired interview link.'); setLoading(false); return }
        setInterviewId(iv.id)
        if (iv.status === 'complete') {
          setDone(true)
          if (!redirected.current) {
            redirected.current = true
            setTimeout(() => { router.push(`/interview/${token}/complete`) }, 2000)
          }
          setLoading(false)
          return
        }
        const history: Message[] = msgRows?.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })) ?? []
        setMessages(history)
        if (history.length === 0) {
          // Kick off opening question
          await sendMessage([], iv.id, token)
        }
      } catch {
        setError('Failed to load interview. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const sendMessage = useCallback(async (history: Message[], ivId: string, tok: string, userContent?: string) => {
    setThinking(true)
    const msgs = userContent ? [...history, { role: 'user' as const, content: userContent }] : history
    if (userContent) setMessages(msgs)

    try {
      const res = await fetch('/api/interviews/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok, interview_id: ivId, messages: msgs }),
      })
      if (!res.ok) throw new Error('Request failed')

      const reader  = res.body?.getReader()
      const decoder = new TextDecoder()
      let   reply   = ''
      let   isDone  = false

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') break
            try {
              const parsed = JSON.parse(raw)
              if (parsed.reply === null && parsed.isDone) {
                isDone = true
                break
              }
              if (typeof parsed.delta === 'string') {
                reply += parsed.delta
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: reply }
                  return updated
                })
              } else if (typeof parsed.reply === 'string') {
                reply = parsed.reply
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: reply }
                  return updated
                })
              }
            } catch { /* skip non-JSON lines */ }
          }
          if (isDone) break
        }
      }

      // Interview complete — server signals completion with { reply: null, isDone: true }
      if (isDone) {
        setDone(true)
        if (!redirected.current) {
          redirected.current = true
          setTimeout(() => { router.push(`/interview/${tok}/complete`) }, 2000)
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
      if (userContent) setLastFailedMsg(userContent)
    } finally {
      setThinking(false)
    }
  }, [router])

  const send = useCallback(() => {
    if (!input.trim() || thinking || done || !interviewId) return
    const content = input.trim()
    setInput('')
    setLastFailedMsg(null)
    sendMessage(messages, interviewId, token, content)
  }, [input, thinking, done, interviewId, messages, token, sendMessage])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }, [send])

  const retryLast = useCallback(() => {
    if (!lastFailedMsg || !interviewId || thinking || done) return
    const msgToRetry = lastFailedMsg
    setLastFailedMsg(null)
    setMessages(prev => prev.slice(0, -1))
    sendMessage(messages.slice(0, -1), interviewId, token, msgToRetry)
  }, [lastFailedMsg, interviewId, thinking, done, messages, token, sendMessage])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    const isInvalid = error.startsWith('Invalid or expired')
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-white font-semibold text-lg mb-2">
            {isInvalid ? 'Link not found' : 'Something went wrong'}
          </h1>
          <p className="text-white/50 text-sm mb-6">
            {isInvalid
              ? 'This interview link is invalid or has expired. Please ask for a new invite.'
              : error}
          </p>
          {!isInvalid && (
            <button onClick={() => window.location.reload()} className="text-teal-400 underline text-sm">
              Try again
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E1117] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 px-4 py-3 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-teal-400 font-bold text-sm">Connai</span>
          <span className="text-white/30 text-xs">Digital Maturity Interview</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${ m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-teal-700/30 text-white'
                  : 'bg-white/5 text-slate-200'
              }`}>
                {m.content || (
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          ))}
          {thinking && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-white/5 rounded-2xl px-4 py-3">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          {done && (
            <div className="text-center py-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-teal-900/40 border border-teal-500/30 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-200 font-semibold">Interview complete</p>
              <p className="text-slate-500 text-sm">Redirecting to your report&hellip;</p>
            </div>
          )}
          {/* Additional context prompt shown after interview completes */}
          {done && !submitted && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-4">
              <p className="text-slate-300 text-sm font-medium mb-3">
                Anything you&apos;d like to add before we finalise your input? (optional)
              </p>
              <textarea
                value={addlContext}
                onChange={e => setAddlContext(e.target.value)}
                placeholder="Any additional context, clarifications, or priorities you want the assessment to consider…"
                rows={3}
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              <button
                onClick={() => { setSubmitted(true); setTimeout(() => { router.push(`/interview/${token}/complete`) }, 800) }}
                className="mt-3 w-full bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Submit &amp; view report &rarr;
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      {!done ? (
        <div className="bg-[#0E1117] border-t border-slate-800 px-4 py-3 flex-shrink-0">
          <div className="max-w-2xl mx-auto flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value) }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 128) + 'px'
              }}
              onKeyDown={onKeyDown}
              placeholder="Type your answer..."
              rows={1}
              disabled={thinking}
              enterKeyHint="send"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 resize-none bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 overflow-y-auto disabled:bg-slate-800"
              style={{ minHeight: '2.5rem', maxHeight: '8rem' }}
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
          <p className="text-xs text-slate-600 text-center mt-2">Enter to send &middot; Shift+Enter for new line</p>
          {lastFailedMsg && !thinking && (
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span className="text-red-400/70 text-xs">Message failed.</span>
              <button
                type="button"
                onClick={retryLast}
                className="text-teal-400 text-xs hover:text-teal-300 underline underline-offset-2 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
