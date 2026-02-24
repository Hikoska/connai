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
  const [isOpen, setIsOpen] = useState(false)
  const [stakeholderEmail, setStakeholderEmail] = useState('')
  const [organisation, setOrganisation] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholder_email: stakeholderEmail,
          organisation,
          country: 'MU',
          industry: 'Tech',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start interview')
      }

      const interviewToken = data.token
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
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {children}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Start your assessment</h2>
              <button
                onClick={() => { setIsOpen(false); setError(null) }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work email
                </label>
                <input
                  type="email"
                  required
                  value={stakeholderEmail}
                  onChange={(e) => setStakeholderEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation
                </label>
                <input
                  type="text"
                  required
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 bg-[#0D5C63] text-white rounded-xl font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Starting your assessment...' : 'Start assessment →'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Takes ~10 minutes · No credit card required
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
