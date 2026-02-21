'use client'

import { useState, useEffect } from 'react'
import { ChatInterface } from './ChatInterface'

export const FloatingAIWidget = () => {
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      // Collapse when user scrolls past 75% of the viewport height
      if (window.scrollY > window.innerHeight * 0.75) {
        setIsExpanded(false)
      } else {
        setIsExpanded(true)
      }
    }

    window.addEventListener('scroll', handleScroll)
    // Initial check
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isExpanded) {
    return (
      <button 
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 flex items-center gap-3 bg-white rounded-full shadow-lg p-3 z-50 hover:shadow-xl transition-shadow"
      >
        <div className="relative">
          <span className="text-2xl">🔭</span>
          <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-teal-500 ring-2 ring-white" />
        </div>
        <span className="font-semibold text-gray-700 pr-2">Ask Connai</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[500px] bg-white rounded-lg shadow-2xl z-50 flex flex-col slide-up-anim">
      <div className="p-3 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔭</span>
          <span className="font-bold text-teal-500">Connai</span>
        </div>
        <button onClick={() => setIsExpanded(false)} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <ChatInterface />
    </div>
  )
}
