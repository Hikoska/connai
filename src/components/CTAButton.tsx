'use client'

export const CTAButton = ({ className }: { className?: string }) => (
  <button
    type="button"
    className={className}
    onClick={() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('connai:open-chat'))
      }
    }}
  >
    Start my free audit →
  </button>
)
