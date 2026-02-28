'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ReportCTAProps {
  leadId: string
}

export default function ReportCTA({ leadId }: ReportCTAProps) {
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const MAX_WAIT = 90_000 // 90 seconds
    const INTERVAL = 3_000  // 3 seconds
    const start = Date.now()

    const poll = async () => {
      try {
        const res = await fetch(`/api/report/${leadId}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.overall_score !== undefined) {
            setReady(true)
            clearInterval(timer)
            return
          }
        }
      } catch {
        // ignore
      }
      if (Date.now() - start >= MAX_WAIT) {
        setTimedOut(true)
        clearInterval(timer)
      }
    }

    const timer = setInterval(poll, INTERVAL)
    poll() // immediate first check
    return () => clearInterval(timer)
  }, [leadId])

  if (timedOut) {
    return (
      <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl text-left">
        <h2 className="text-lg font-semibold text-white mb-1">Report generating</h2>
        <p className="text-sm text-white/50 mb-4">
          Your digital maturity report is still being prepared. Check back shortly.
        </p>
        <Link
          href={`/report/${leadId}`}
          className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors hover:bg-white/20"
        >
          Check report →
        </Link>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl text-left">
        <h2 className="text-lg font-semibold text-white mb-1">Generating your report</h2>
        <p className="text-sm text-white/50 mb-4">
          Analysing your responses — this usually takes less than a minute.
        </p>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/20 border-t-teal-400 rounded-full animate-spin" />
          <span className="text-sm text-white/40">Please wait…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl text-left">
      <h2 className="text-lg font-semibold text-white mb-1">Your report is ready</h2>
      <p className="text-sm text-white/50 mb-4">Your digital maturity report has been generated.</p>
      <Link
        href={`/report/${leadId}`}
        className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
      >
        View report ↫
      </Link>
    </div>
  )
}
