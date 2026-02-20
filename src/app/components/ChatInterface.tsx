'use client'
import { useChat } from 'ai/react'

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit } = useChat()

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg px-4 py-2 rounded-lg ${m.role === 'user' ? 'bg-teal-500 text-white' : 'bg-gray-100'}`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            className="flex-1 border-gray-300 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
          />
          <button type="submit" className="btn-primary px-6 py-2">Send</button>
        </form>
      </div>
    </div>
  )
}
