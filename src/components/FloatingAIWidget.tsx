'use client'

import React, { useState, useEffect, useRef } from 'react'
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

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  })

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
            .then(res => { if (res.token) setLeadId(res.token) })
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
              &times;
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-400">Ask me anything about your digital maturity...</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block px-3 py-2 rounded-xl max-w-[90%] whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-[#0D5C63] text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {stripTags(m.content)}
                </span>
              </div>
            ))}
            {isLoading && <p className="text-xs text-gray-400">Thinking...</p>}
            {auditUrl && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-teal-800 mb-1">Audit page ready ✓</p>
                <a href={auditUrl} className="text-teal-600 underline break-all text-xs">
                  {window?.location?.origin}{auditUrl}
                </a>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0D5C63]"
            />
            <button
              type="submit"
              disabled={isLoading}
              aria-label="Send message"
              className="bg-[#0D5C63] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#0a4a50] disabled:opacity-50"
            >
              &#8594;
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#0D5C63] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-[#0a4a50] transition-colors"
          aria-label="Open chat"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}
    </div>
  )
}
