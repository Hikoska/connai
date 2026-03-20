'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console in dev; swap for a monitoring service in production
    console.error('[Connai] Unhandled error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <p className="text-teal-400 text-sm font-semibold uppercase tracking-widest">Unexpected error</p>
            <h1 className="text-3xl font-bold text-white">Something went wrong</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              An unexpected error occurred. Try refreshing — if the problem persists, contact support.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={reset}
              className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              Try again
            </button>
            <a
              href="/"
              className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              Back to home
            </a>
          </div>
          {error.digest && (
            <p className="text-slate-600 text-xs font-mono">Error ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  )
}
