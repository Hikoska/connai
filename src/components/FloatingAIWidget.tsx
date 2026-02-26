'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from 'ai/react'

function stripTags(content: string): string {
  return content
    .replace(/<CONNAI_CAPTURE>[\s\S]*?<\/CONNAI_CAPTURE>/g, '')
    .replace(/<CONNAI_STAKEHOLDERS>[\s\S]*?<\/CONNAI_STAKEHOLDERS>/g, '')
    .trim()
}

export function FloatingAIWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [leadId, setLeadId] = useState<string | null>(null)
  const [auditUrl, setAuditUrl] = useState<string | null>(null)
  const processedIds = useRef<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  })

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Listen for external open trigger (e.g. from FAQ "Ask Connai" button)
  useEffect(() => {
    const handler = () => setIsOpen(true)
    window.addEventListener('connai:open-chat', handler)
    return () => window.removeEventListener('connai:open-chat', handler)
  }, [])

  // Detect CONNAI tags in completed assistant messages
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== 'assistant' || !msg.content || processedIds.current.has(msg.id)) continue

      const captureMatch = msg.content.match(/<CONNAI_CAPTURE>([\s\S]*?)<\/CONNAI_CAPTURE>/)
      if (captureMatch) {
        processedIds.current.add(msg.id)
        try {
          const data = JSON.parse(captureMatch[1])
          fetch('/api/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
            .then(r => r.json())
            .then(res => { if (res.token) { setLeadId(res.token); router.push('/dashboard') } })
            .catch(e => console.error('[CONNAI_CAPTURE] fetch failed', e))
        } catch (e) {
          console.error('[CONNAI_CAPTURE] parse error', e)
        }
        continue
      }

      const stakeholdersMatch = msg.content.match(/<CONNAI_STAKEHOLDERS>([\s\S]*?)<\/CONNAI_STAKEHOLDERS>/)
      if (stakeholdersMatch && leadId) {
        processedIds.current.add(msg.id)
        try {
          const stakeholders = JSON.parse(stakeholdersMatch[1])
          fetch('/api/invites/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: leadId, stakeholders }),
          })
            .then(r => r.json())
            .then(res => { if (res.audit_url) setAuditUrl(res.audit_url) })
            .catch(e => console.error('[CONNAI_STAKEHOLDERS] fetch failed', e))
        } catch (e) {
          console.error('[CONNAI_STAKEHOLDERS] parse error', e)
        }
      }
    }
  }, [messages, leadId])

  return (
    <div className={`fixed bottom-4 right-4 ${isOpen ? 'z-[70]' : 'z-50'}`}>
      {isOpen ? (
        <div className="flex flex-col bg-white rounded-2xl shadow-2xl w-80 h-96 border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800">Connai</span>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm px-3 py-2 rounded-xl max-w-[90%] ${
                  msg.role === 'user'
                    ? 'ml-auto bg-[#0D5C63] text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {stripTags(msg.content)}
              </div>
            ))}
            {isLoading && (
              <div className="bg-gray-100 text-gray-800 rounded-xl rounded-bl-sm px-3 py-2 text-sm max-w-[90%]">
                <div className="flex gap-1">
                  <span className="animate-bounce [animation-delay:0ms]">·</span>
                  <span className="animate-bounce [animation-delay:150ms]">·</span>
                  <span className="animate-bounce [animation-delay:300ms]">·</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {auditUrl ? (
            <div className="px-4 py-3 border-t border-gray-100 text-center">
              <a
                href={auditUrl}
                className="text-sm text-[#0D5C63] font-medium hover:underline"
              >
                View your audit report →
              </a>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-3 py-2 border-t border-gray-100"
            >
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Type a message…"
                className="flex-1 text-sm px-3 py-1.5 rounded-full border border-gray-200 focus:outline-none focus:border-[#0D5C63]"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-7 h-7 bg-[#0D5C63] text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-[#0a4a50] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[#0D5C63] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#0a4a50] transition-colors"
          aria-label="Open Connai chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}