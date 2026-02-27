'use client'

import { useRouter } from 'next/navigation'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
  leadId?: string
}

export function PricingModal({ isOpen, onClose, leadId }: PricingModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const handleProceed = () => {
    onClose()
    if (leadId) router.push(`/audit/${leadId}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-[#161b22] border border-white/10 text-white rounded-xl p-8 w-full max-w-md mx-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-2">Add More Stakeholders</h2>
        <p className="text-white/60 text-sm mb-6">
          Multi-perspective audits deliver richer insights and a stronger action plan.
          Each additional stakeholder counts as one interview credit.
        </p>

        <div className="space-y-3 mb-6">
          <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
            <p className="font-semibold text-sm">
              $99 <span className="text-white/40 font-normal">/ interview</span>
            </p>
            <p className="text-xs text-white/40 mt-0.5">Pay per stakeholder, one at a time.</p>
          </div>
          <div className="bg-teal-900/20 border border-teal-500/20 p-4 rounded-lg">
            <p className="font-semibold text-sm">
              $899 <span className="text-white/40 font-normal">for 10 interviews</span>
            </p>
            <p className="text-xs text-white/40 mt-0.5">Best value for multi-stakeholder audits.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
            <p className="font-semibold text-sm">
              $7,999 <span className="text-white/40 font-normal">for 100 interviews</span>
            </p>
            <p className="text-xs text-white/40 mt-0.5">Enterprise volume pricing.</p>
          </div>
        </div>

        <p className="text-xs text-amber-400/80 bg-amber-900/20 border border-amber-500/20 p-3 rounded-lg mb-5">
          Beta: payments are simulated — all features remain fully accessible during the beta period.
        </p>

        <button
          onClick={handleProceed}
          className="w-full bg-teal-600 text-white font-semibold py-3 rounded-lg hover:bg-teal-500 transition-colors"
        >
          Add Stakeholder →
        </button>
      </div>
    </div>
  )
}
