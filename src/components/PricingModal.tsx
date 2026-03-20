'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export function PricingModal({ isOpen, onClose, auditId }: { isOpen: boolean; onClose: () => void; auditId?: string }) {
  // Close on Escape key (WCAG 2.1 — no keyboard trap)
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add stakeholders pricing"
    >
      <div
        className="bg-[#131920] border border-white/10 text-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Add More Stakeholders</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pricing modal"
            className="text-white/50 hover:text-white/90 transition-colors text-2xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
          >&times;</button>
        </div>
        <p className="text-white/60 text-sm mb-6">
          Your first interview is always free. Add more perspectives for a richer, multi-dimensional report.
        </p>

        <div className="space-y-3 mb-6">
          <div className="bg-white/5 border border-white/20 p-4 rounded-xl">
            <p className="font-semibold text-white">$99 <span className="text-white/60 font-normal text-sm">/ stakeholder</span></p>
            <p className="text-xs text-white/60 mt-0.5">Add perspectives one by one.</p>
          </div>
          <div className="bg-teal-900/30 border border-teal-500/20 p-4 rounded-xl">
            <p className="font-semibold text-white">$899 <span className="text-white/60 font-normal text-sm">for 10 stakeholders</span></p>
            <p className="text-xs text-white/60 mt-0.5">Best value for a comprehensive audit.</p>
          </div>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-500/20 text-yellow-300 text-xs p-3 rounded-lg mb-6">
          <span className="font-bold">Beta offer:</span> You are in our free beta &mdash; all interviews are complimentary until launch.
        </div>

        {auditId ? (
          <Link
            href={`/audit/${auditId}`}
            className="block w-full text-center bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131920]"
            onClick={onClose}
          >
            Add Stakeholder (Beta &mdash; Free)
          </Link>
        ) : (
          <button type="button"
            onClick={onClose}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131920]"
          >
            Add Stakeholder (Beta &mdash; Free)
          </button>
        )}
      </div>
    </div>
  )
}
