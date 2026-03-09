'use client'

import { useState } from 'react'

interface FeedbackBarProps {
  reportId: string
}

export function FeedbackBar({ reportId }: FeedbackBarProps) {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (helpful: boolean) => {
    try {
      const res = await fetch(`/api/report/${reportId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      })

      if (!res.ok) {
        throw new Error('Failed to submit feedback')
      }

      setSubmitted(true)
    } catch (err) {
      setError('Failed to submit feedback')
    }
  }

  if (submitted) {
    return <div className="text-center py-4 text-sm text-slate-300">Thanks for the feedback!</div>
  }

  return (
    <div className="flex justify-center gap-4 py-4 border-t border-slate-800">
      <button
        type="button"
        onClick={() => handleSubmit(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        👍 Helpful
      </button>
      <button
        type="button"
        onClick={() => handleSubmit(false)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        👎 Not helpful
      </button>
    </div>
  )
}
