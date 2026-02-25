'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

const INDUSTRIES = [
  'Technology / Software',
  'Financial Services',
  'Healthcare',
  'Retail / E-commerce',
  'Manufacturing',
  'Professional Services',
  'Education',
  'Government / Public Sector',
  'Media & Entertainment',
  'Other',
]

const ROLES = [
  'C-Suite / Executive',
  'Director / VP',
  'Manager',
  'Consultant / Advisor',
  'Other',
]

interface StartInterviewButtonProps {
  className?: string
  children?: React.ReactNode
}

export function StartInterviewButton({ className, children }: StartInterviewButtonProps) {
  const [email, setEmail] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [industry, setIndustry] = useState('')
  const [role, setRole] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org: organisation,
          email,
          industry: industry || undefined,
          role: role || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.token) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setIsLoading(false)
        return
      }
      setIsOpen(false)
      setIsLoading(false)
      const path = data.flow === 'audit' ? `/audit/${data.token}` : `/interview/${data.token}`
      router.push(path)
    } catch {
      setError('Network error. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {children ?? 'Start Free Assessment'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Start Your Free Audit</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
                <input
                  type="text"
                  required
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  placeholder="Your company name"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0D5C63] text-gray-700 bg-white"
                >
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Role <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0D5C63] text-gray-700 bg-white"
                >
                  <option value="">Select your role</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0D5C63] text-white font-semibold py-3 rounded-xl hover:bg-[#0a4a50] transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Starting...' : 'Begin Audit →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default StartInterviewButton
