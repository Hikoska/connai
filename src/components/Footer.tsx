import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-[#0a1e2e] border-t border-white/5 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg width="24" height="21" viewBox="0 0 32 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="1" y="16" width="8" height="12" rx="4" fill="#0ab8ca" />
                <rect x="12" y="8" width="8" height="20" rx="4" fill="#0791a0" />
                <rect x="23" y="1" width="8" height="27" rx="4" fill="#0D5C63" />
              </svg>
              <span className="text-white font-bold">Connai</span>
            </div>
            <p className="text-white/30 text-xs">AI-powered digital maturity audits for SMEs.</p>
            <p className="text-white/20 text-xs mt-1">Powered by AI &middot; Built by Linkgrow</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/#how-it-works" className="text-white/50 hover:text-white/80 transition-colors">How it works</Link>
            <Link href="/dashboard" className="text-white/50 hover:text-white/80 transition-colors">Dashboard</Link>
            <Link href="/audit/new" className="text-white/50 hover:text-white/80 transition-colors">Start audit</Link>
            <Link href="/privacy" className="text-white/50 hover:text-white/80 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-white/50 hover:text-white/80 transition-colors">Terms</Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">&copy; 2026 Linkgrow Ltd. All rights reserved.</p>
          <p className="text-white/20 text-xs">Beta &middot; Free during beta</p>
        </div>
      </div>
    </footer>
  )
}
