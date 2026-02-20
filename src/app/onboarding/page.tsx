'use client'

import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function OnboardingRedirect() {
  useEffect(() => {
    redirect('/')
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting...</p>
    </div>
  )
}
