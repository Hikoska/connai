'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message { role: 'ai' | 'user'; content: string }

export default function InterviewPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [interview, setInterview] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [validating, setValidating] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    validateInterview()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const validateInterview = async () => {
    const { data } = await supabase
      .from('interviews')
      .select('*, audits(title, context, department)')
      .eq('token', params.id)
      .eq('status', 'scheduled')
      .single()
    if (data) {
      setInterview(data)
      await supabase.from('interviews').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', data.id)
      await startInterview(data)
    }
    setValidating(false)
  }

  const startInterview = async (iv: any) => {
    setLoading(true)
    const res = await fetch('/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interview_id: iv.id, subject_name: iv.subject_name, subject_role: iv.subject_role, org_context: iv.audits?.context }),
    })
    const data = await res.json()
    setMessages([{ role: 'ai', content: data.message }])
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    const res = await fetch('/api/interview/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interview_id: interview.id, messages: newMessages }),
    })
    const data = await res.json()

    if (data.is_complete) {
      setMessages([...newMessages, { role: 'ai', content: data.message }])
      setDone(true)
      await supabase.from('interviews').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', interview.id)
    } else {
      setMessages([...newMessages, { role: 'ai', content: data.message }])
    }
    setLoading(false)
  }

  if (validating) return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center">
      <div className="text-center"><span className="text-4xl animate-pulse">🔭</span><p className="mt-4 text-gray-500">Preparing your interview...</p></div>
    </div>
  )

  if (!interview) return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center">
      <div className="card text-center max-w-md">
        <span className="text-4xl">❌</span>
        <h2 className="text-xl font-bold mt-3">Interview not found</h2>
        <p className="text-gray-500 mt-2">This link may have expired or already been used.</p>
      </div>
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center">
      <div className="card text-center max-w-md">
        <span className="text-5xl">🎉</span>
        <h2 className="text-2xl font-bold mt-3">Interview complete!</h2>
        <p className="text-gray-600 mt-3">Thank you {interview.subject_name}. Your responses have been recorded and will contribute to the digital maturity report.</p>
        <p className="text-gray-400 text-sm mt-4">You can close this window now.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🔭</span>
          <div>
            <div className="font-semibold text-teal-500">Digital Maturity Interview</div>
            <div className="text-xs text-gray-400">{interview.audits?.title} · Strictly confidential</div>
          </div>
        </div>
      </header>

      {/* Chat */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4 overflow-y-auto">
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-sm text-teal-700">
          Hi {interview.subject_name || 'there'}! I'm an AI research assistant. This confidential interview will take about 15-20 minutes. Your honest answers help your organisation improve.
        </div>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-teal-500 text-white rounded-br-none'
                : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
              <span className="text-gray-400 text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={loading || done}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-300"
            placeholder="Type your answer..." />
          <button onClick={sendMessage} disabled={loading || !input.trim() || done}
            className="btn-primary px-6 disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
