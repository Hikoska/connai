// This file intentionally left as a fallback UI while the server Route Handler
// (route.ts) processes the auth callback. In practice, route.ts handles the
// redirect before this page ever renders for PKCE / OAuth flows.

export default function AuthCallbackFallback() {
  return (
    <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
