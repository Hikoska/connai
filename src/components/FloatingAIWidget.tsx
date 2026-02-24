'use client';

import React, { useState } from 'react';
import { useChat } from 'ai/react';

export function FloatingAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="flex flex-col bg-white rounded-2xl shadow-2xl w-80 h-96 border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800">Connai</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-400">Ask me anything about your digital maturity...</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block px-3 py-2 rounded-xl max-w-[90%] ${
                  m.role === 'user' ? 'bg-[#0D5C63] text-white' : 'bg-gray-100 text-gray-800'
                }`}>{m.content}</span>
              </div>
            ))}
            {isLoading && <p className="text-xs text-gray-400">Thinking...</p>}
          </div>
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0D5C63]"
            />
            <button type="submit" disabled={isLoading} className="bg-[#0D5C63] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#0a4a50] disabled:opacity-50">
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
  );
}

export default FloatingAIWidget;
