'use client'

import Link from 'next/link'

export function PricingModal({ isOpen, onClose, auditId }: { isOpen: boolean; onClose: () => void; auditId?: string }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#131920] border border-white/10 text-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-2">Add More Stakeholders</h2>
        <p className="text-white/50 text-sm mb-6">
          Your first interview is always free. Add more perspectives for a richer, multi-dimensional report.
        </p>

        <div className="space-y-3 mb-6">
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
            <p className="font-semibold text-white">$99 <span className="text-white/40 font-normal text-sm">/ stakeholder</span></p>
            <p className="text-xs text-white/40 mt-0.5">Add perspectives one by one.</p>
          </div>
          <div className="bg-teal-900/30 border border-teal-500/20 p-4 rounded-xl">
            <p className="font-semibold text-white">$899 <span className="text-white/40 font-normal text-sm">for 10 stakeholders</span></p>
            <p className="text-xs text-white/40 mt-0.5">Best value for a comprehensive audit.</p>
          </div>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-500/20 text-yellow-300 text-xs p-3 rounded-lg mb-6">
          <span className="font-bold">Beta offer:</span> You are in our free beta — all interviews are complimentary until launch.
        </div>

        {auditId ? (
          <Link
            href={`/audit/${auditId}`}
            className="block w-full text-center bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors"
            onClick={onClose}
          >
            Add Stakeholder (Beta — Free)
          </Link>
        ) : (
          <button
            onClick={onClose}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Add Stakeholder (Beta — Free)
          </button>
        )}
      </div>
    </div>
  )
}
