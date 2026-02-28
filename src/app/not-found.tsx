import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <p className="text-teal-400 text-sm font-semibold uppercase tracking-widest">Error 404</p>
          <h1 className="text-7xl font-bold text-white">404</h1>
          <h2 className="text-2xl font-semibold text-white">Page not found</h2>
          <p className="text-white/40 text-sm max-w-xs mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-teal-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-teal-500 transition-colors text-sm"
          >
            Back to home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center bg-white/5 border border-white/10 text-white/70 font-semibold py-2.5 px-6 rounded-lg hover:bg-white/10 transition-colors text-sm"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
