'use client'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
export default function SignupRedirect() {
  useEffect(() => { redirect('/') }, [])
  return <p>Redirecting...</p>
}
