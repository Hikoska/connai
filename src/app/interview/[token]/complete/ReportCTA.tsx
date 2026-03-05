'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ReportCTAProps {
  leadId: string
}

const STATUS_MESSAGES = [
  'Reading your responses\u2026',
  'Finding patterns\u2026',
  'Scoring each dimension\u2026',
  'Building your report\u2026',
  'Almost there\u2026',
]

type Phase = 'interviewing' | 'analysing' | 'ready'

function AIProgressStepper({ phase }: { phase: Phase }) {
  const steps: { key: Phase; icon: string; label: string }[] = [
    { key: 'interviewing', icon: '\u2713', label: 'Interview complete' },
    { key: 'analysing',    icon: '\u2699',  label: 'Analysing' },
    { key: 'ready',        icon: '\ud83d\udcca', label: 'Report ready' },
  ]
  const order: Phase[] = ['interviewing', 'analysing', 'ready']
  const currentIdx = order.indexOf(phase)

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        const pending = i > currentIdx
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500
                ${done   ? 'bg-teal-500 text-white'  : ''}
                ${active ? 'bg-white/10 border-2 border-teal-400 text-teal-400' : ''}
                ${pending ? 'bg-white/5 border border-white/20 text-white/20' : ''}
              `}>
                {active ? (
                  <span className="w-4 h-4 border-2 border-teal-400/40 border-t-teal-400 rounded-full animate-spin" />
                ) : (
                  <span>{s.icon}</span>
                )}
              </div>
              <span className={`text-xs font-medium text-center leading-tight max-w-[72px]
                ${done ? 'text-teal-300' : active ? 'text-white' : 'text-white/30'}
              `}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-px mx-1 mb-6 transition-all duration-500
                ${i < currentIdx ? 'bg-teal-500' : 'bg-white/15'}
              `} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ReportCTA({ leadId }: ReportCTAProps) {
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)

  // Cycle status messages every 4s
  useEffect(() => {
    if (ready || timedOut) return
    const t = setInterval(() => setMsgIdx(i => (i + 1) % STATUS_MESSAGES.length), 4000)
    return () => clearInterval(t)
  }, [ready, timedOut])

  useEffect(() => {
    const MAX_WAIT = 90_000
    const INTERVAL = 3_000
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
        // ignore network errors
      }
      if (Date.now() - start >= MAX_WAIT) {
        setTimedOut(true)
        clearInterval(timer)
      }
    }

    const timer = setInterval(poll, INTERVAL)
    poll()
    return () => clearInterval(timer)
  }, [leadId])

  const phase: Phase = ready ? 'ready' : 'analysing'

  if (timedOut) {
    return (
      <div className="mt-2 p-6 bg-white/5 border border-white/20 rounded-xl text-left">
        <AIProgressStepper phase="analysing" />
        <h2 className="text-lg font-semibold text-white mb-1">Still processing</h2>
        <p className="text-sm text-white/60 mb-4">
          Your report is taking a little longer. You can check back — it will be ready shortly.
        </p>
        <Link
          href={`/report/${leadId}`}
          className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-6 py-3 rounded-lg transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1117]"
        >
          Check report &rarr;
        </Link>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="mt-2 p-6 bg-white/5 border border-white/20 rounded-xl text-left">
        <AIProgressStepper phase="analysing" />
        {/* Skeleton lines */}
        <div className="space-y-2 mb-5">
          <div className="h-2.5 bg-white/10 rounded-full animate-pulse w-[80%]" />
          <div className="h-2.5 bg-white/10 rounded-full animate-pulse w-[60%]" />
          <div className="h-2.5 bg-white/10 rounded-full animate-pulse w-[45%]" />
        </div>
        <p className="text-sm text-teal-300/80 font-medium transition-all duration-500">
          {STATUS_MESSAGES[msgIdx]}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2 p-6 bg-white/5 border border-teal-500/30 rounded-xl text-left transition-all duration-300">
      <AIProgressStepper phase="ready" />
      <h2 className="text-lg font-semibold text-white mb-1">Your report is ready</h2>
      <p className="text-sm text-white/60 mb-4">
        Your digital maturity report is complete. Click below to view it.
      </p>
      <Link
        href={`/report/${leadId}`}
        className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-bold px-6 py-3 rounded-lg transition-colors shadow-lg shadow-teal-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1117]"
      >
        View my report &rarr;
      </Link>
    </div>
  )
}
