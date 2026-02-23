'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StartInterviewButtonProps {
  className?: string
  children: React.ReactNode
}

export const StartInterviewButton = ({ className, children }: StartInterviewButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)

    const interviewDetails = {
      stakeholder_email: 'test@example.com', // Placeholder
      organisation: 'Test Corp', // Placeholder
      country: 'MU',
      industry: 'Tech',
    }

    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interviewDetails),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start interview')
      }

      const interviewToken = data.interview_token
      if (interviewToken) {
        router.push(`/interview/${interviewToken}`)
      } else {
        throw new Error('Interview token was not returned')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      console.error('Error starting interview:', errorMessage)
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? 'Starting...' : children}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </>
  )
}
