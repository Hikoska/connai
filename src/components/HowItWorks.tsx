'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'

const steps = [
  { 
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    step: '01',
    title: 'Brief the AI',
    description: 'In a short 5-minute conversation, provide Connai with your organisation\'s size, key departments, and goals. The audit is tailored to your specific context.',
  },
  { 
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
    step: '02',
    title: 'AI Conducts Interviews',
    description: 'Connai interviews relevant team members simultaneously at scale — 100% transcript fidelity, intelligent follow-ups, no fatigue or bias.',
  },
  { 
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    step: '03',
    title: 'Receive Your Report',
    description: 'Within days, not months: a quantifiable score, industry benchmarks, gap analysis, and a prioritised roadmap — all ready to act on.',
  },
]

export const HowItWorks = () => {
  const sectionRef = useScrollReveal<HTMLDivElement>()

  return (
    <section id="how-it-works" className="py-16 bg-white border-t border-gray-100">
      <div ref={sectionRef} className="scroll-hidden max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold font-serif mb-3">How it works</h2>
          <p className="text-gray-500 max-w-xl mx-auto">From briefing to a full report in three simple steps.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.step} className="relative p-8 rounded-2xl border border-gray-100 bg-[#F8F6F2] hover:border-teal-200 hover:shadow-sm transition-all">
              <div className="text-teal-600 mb-4">{step.icon}</div>
              <div className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-2">{step.step}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
