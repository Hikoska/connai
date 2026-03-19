export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav skeleton */}
      <div className="border-b border-slate-800 px-6 py-4 bg-slate-950/95">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="h-5 w-20 bg-slate-800 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-7 w-16 bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-7 w-24 bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* Score card skeleton */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="h-4 w-24 bg-slate-800 rounded animate-pulse mb-2" />
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-6" />
          <div className="h-16 w-24 bg-slate-800 rounded animate-pulse mb-2" />
          <div className="h-3 w-48 bg-slate-800 rounded animate-pulse" />
        </div>
        {/* Summary skeleton */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="h-5 w-36 bg-slate-800 rounded animate-pulse mb-4" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-4/6 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
        {/* Dimensions skeleton */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="h-5 w-40 bg-slate-800 rounded animate-pulse mb-6" />
          <div className="space-y-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1.5">
                  <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-12 bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="h-2 bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
