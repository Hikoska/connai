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
    setTimeout(() => { if (leadId) router.push(`/report/${leadId}`) }, 2000)
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
        }).catch(() => null)
        if (lead?.org_name) setOrgName(lead.org_name)

        const res = await fetch('/api/interviews/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, messages: [] }),
        })
        const data = await res.json()
        if (data.message) setMessages([{ role: 'assistant', content: data.message }])
        setLoading(false)
      } catch {
        setError('Failed to load interview. Please try again.')
        setLoading(false)
      }
    }
    init()
  }, [token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function send() {
    const text = input.trim()
    if (!text || thinking || done) return
    const updated: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setInput('')
    setThinking(true)
    try {
      const res = await fetch('/api/interviews/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, messages: updated }),
      })
      const data = await res.json()
      if (data.message) {
        const final: Message[] = [...updated, { role: 'assistant', content: data.message }]
        setMessages(final)
        if (data.done) {
          setDone(true)
          await fetch('/api/interviews/complete', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, answers: final }),
          })
        }
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I had a connection issue. Please try again.' },
      ])
    }
    setThinking(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Preparing your interview...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">C</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Connai AI Interviewer</p>
          {orgName && (
            <p className="text-xs text-gray-400">
              {orgName}
              {' · '}
              Digital Maturity Assessment
            </p>
          )}
          {messages.length > 0 && (
            <p className="text-xs text-teal-600 font-medium">
              Question {Math.ceil(messages.length / 2)} of 20
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#0D5C63] text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar or done state */}
      {done ? (
        <div className="bg-white border-t border-gray-100 px-4 py-6 flex-shrink-0">
          <div className="max-w-2xl mx-auto space-y-4">
            {submitted ? (
              <div className="text-center space-y-2">
                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-800 font-semibold">Submitted — taking you to the report…</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-gray-800 font-semibold">Interview complete</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Anything you&apos;d like to add before we finalise your input? (optional)
                  </p>
                </div>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Any additional context, clarifications, or priorities you want the assessment to consider…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={submitWithComment}
                    disabled={submitting}
                    className="flex-1 bg-[#0D5C63] hover:bg-[#0a4a50] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Submitting…' : 'Submit & view results'}
                  </button>
                  {!comment.trim() && (
                    <button
                      onClick={() => { setSubmitted(true); setTimeout(() => { if (leadId) router.push(`/report/${leadId}`) }, 800) }}
                      className="text-sm text-gray-400 hover:text-gray-600 px-3"
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
        <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0">
          <div className="max-w-2xl mx-auto flex gap-3 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your answer..."
              rows={2}
              disabled={thinking}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 max-h-32 overflow-y-auto disabled:bg-gray-50"
            />
            <button
              onClick={send}
              disabled={!input.trim() || thinking}
              className="w-10 h-10 bg-[#0D5C63] hover:bg-[#0a4a50] text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </div>
  )
}