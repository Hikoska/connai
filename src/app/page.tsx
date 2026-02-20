import Link from 'next/link'

const PACKS = [
  { name: 'Starter', interviews: 5, price: 500, per: 100, savings: '1,750' },
  { name: 'Team', interviews: 20, price: 1500, per: 75, savings: '7,500', popular: true },
  { name: 'Department', interviews: 50, price: 3500, per: 70, savings: '19,000' },
  { name: 'Company', interviews: 100, price: 6000, per: 60, savings: '39,000' },
]

const SUBS = [
  { name: 'Pulse', interviews: '10/mo', price: 150, features: ['1 department', 'Monthly refresh', 'PDF export'] },
  { name: 'Monitor', interviews: '30/mo', price: 350, features: ['3 departments', 'Monthly refresh', 'Trend dashboard'] },
  { name: 'Intelligence', interviews: '100/mo', price: 800, features: ['All departments', 'Weekly refresh', 'C-suite dashboard', 'API access'] },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔭</span>
            <span className="font-bold text-teal-500 text-xl">Connai</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-gray-600 hover:text-teal-500 font-medium">Log in</Link>
            <Link href="/auth/signup" className="btn-primary text-sm py-2 px-4">Start free audit</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-500 to-teal-700 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium mb-6">
            ✨ AI-powered digital maturity audits
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Get a $10,000 digital maturity audit<br />
            <span className="text-teal-200">in days, not months</span>
          </h1>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Traditional consultants charge $200–$450 per interview. Connai does it at 42% of that cost — 
            with 100% transcript fidelity, simultaneous interviews across your entire org, and reports in days.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/signup" className="bg-white text-teal-500 font-bold px-8 py-4 rounded-lg hover:bg-teal-50 transition-colors text-lg">
              Start free audit →
            </Link>
            <a href="#pricing" className="border-2 border-white/50 text-white font-semibold px-8 py-4 rounded-lg hover:bg-white/10 transition-colors text-lg">
              View pricing
            </a>
          </div>
          <p className="text-teal-200 text-sm mt-4">No credit card required · 1 free interview included</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
          <p className="text-gray-500 text-center mb-12">From briefing to report in days, not months</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { step: '1', icon: '🎯', title: 'Brief the AI', desc: 'C-suite sets context, departments, and interview scope in minutes' },
              { step: '2', icon: '📅', title: 'AI schedules', desc: 'Automated calendar invites sent to employees across hierarchy' },
              { step: '3', icon: '🤖', title: 'AI interviews', desc: '100% transcript fidelity, zero fatigue, simultaneous at scale' },
              { step: '4', icon: '📊', title: 'Report ready', desc: 'Structured audit with risk register, opportunities, action plan' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">{item.step}</div>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value vs consultant */}
      <section className="py-16 px-4 bg-teal-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">The consultant comparison</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-red-100">
              <div className="text-red-500 font-bold text-lg mb-3">Traditional consultant</div>
              <div className="text-4xl font-bold text-red-500 mb-2">$200–$450</div>
              <div className="text-gray-500 text-sm mb-4">per interview (2–3hr consultant time)</div>
              <ul className="text-sm text-gray-600 space-y-1 text-left">
                <li>✗ 30% recall accuracy on notes</li>
                <li>✗ Sequential interviews — weeks of elapsed time</li>
                <li>✗ 4–8 weeks for final report</li>
                <li>✗ Consultant fatigue and bias accumulate</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 border border-teal-200">
              <div className="text-teal-500 font-bold text-lg mb-3">Connai</div>
              <div className="text-4xl font-bold text-teal-500 mb-2">$60–$100</div>
              <div className="text-gray-500 text-sm mb-4">per interview (AI-powered)</div>
              <ul className="text-sm text-gray-600 space-y-1 text-left">
                <li>✅ 100% transcript fidelity</li>
                <li>✅ 100 simultaneous interviews in one week</li>
                <li>✅ Report in days, not months</li>
                <li>✅ Zero fatigue — consistent quality across all</li>
              </ul>
            </div>
          </div>
          <p className="text-teal-700 font-semibold text-lg">
            100-employee audit: Save $14,000–$39,000 vs. a consultant
          </p>
        </div>
      </section>

      {/* Pricing - Packs */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">Interview Packs</h2>
          <p className="text-gray-500 text-center mb-12">One-off audits. Credits valid 12 months.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {PACKS.map(pack => (
              <div key={pack.name} className={`rounded-xl p-6 border-2 ${pack.popular ? 'border-teal-500 shadow-lg relative' : 'border-gray-100'}`}>
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</div>
                )}
                <div className="font-bold text-lg mb-1">{pack.name}</div>
                <div className="text-gray-500 text-sm mb-4">{pack.interviews} interviews</div>
                <div className="text-3xl font-bold text-teal-500 mb-1">${pack.price.toLocaleString()}</div>
                <div className="text-gray-400 text-xs mb-4">${pack.per}/interview</div>
                <div className="text-xs text-green-600 font-medium mb-6">Save up to ${pack.savings} vs consultant</div>
                <Link href={`/checkout?pack=${pack.name.toLowerCase()}`} className="block text-center btn-primary text-sm py-2">
                  Get {pack.name}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <h2 className="text-3xl font-bold text-center mb-2">Subscriptions</h2>
            <p className="text-gray-500 text-center mb-12">Ongoing intelligence. Monthly interview refresh.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SUBS.map(sub => (
                <div key={sub.name} className="rounded-xl p-6 border-2 border-gray-100">
                  <div className="font-bold text-lg mb-1">{sub.name}</div>
                  <div className="text-gray-500 text-sm mb-4">{sub.interviews} interviews</div>
                  <div className="text-3xl font-bold text-teal-500 mb-4">${sub.price}<span className="text-base text-gray-400 font-normal">/mo</span></div>
                  <ul className="text-sm text-gray-600 space-y-2 mb-6">
                    {sub.features.map(f => <li key={f} className="flex items-center gap-2"><span className="text-teal-500">✓</span>{f}</li>)}
                  </ul>
                  <Link href={`/checkout?plan=${sub.name.toLowerCase()}`} className="block text-center btn-secondary text-sm py-2">
                    Start {sub.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Free tier CTA */}
      <section className="py-16 px-4 bg-teal-500 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Try it free — no credit card</h2>
        <p className="text-teal-100 mb-8 text-lg">1 AI interview + basic report included. See exactly what we find.</p>
        <Link href="/auth/signup" className="bg-white text-teal-500 font-bold px-10 py-4 rounded-lg hover:bg-teal-50 transition-colors text-lg inline-block">
          Start your free audit →
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔭</span>
            <span className="font-bold text-white">Connai</span>
          </div>
          <div className="text-sm">© 2026 Linkgrow Ltd · connai.linkgrow.io</div>
        </div>
      </footer>
    </div>
  )
}
