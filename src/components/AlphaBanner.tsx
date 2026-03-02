'use client'

import { useState, useEffect } from 'react'

export const AlphaBanner = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const bannerDismissed = localStorage.getItem('connaiAlphaBannerDismissed')
    if (bannerDismissed !== 'true') {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('connaiAlphaBannerDismissed', 'true')
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="bg-amber-500 text-amber-900 text-sm text-center px-10 py-2 relative min-h-[36px] flex items-center justify-center">
      <span>Connai is in alpha — features may change and bugs are expected.</span>
      <button onClick={handleDismiss} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 font-bold text-lg leading-none hover:opacity-70 transition-opacity" aria-label="Dismiss banner">
        &times;
      </button>
    </div>
  )
}
