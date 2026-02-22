'use client'
import CountUp from 'react-countup'

type Stat = {
  value?: number
  display?: string
  label: string
  sublabel?: string
}

const stats: Stat[] = [
  { value: 1200, label: 'Organisations onboarded' },
  { value: 100, label: 'Transcript fidelity', sublabel: 'Every word captured, verbatim' },
  { display: '<10%', label: 'Of traditional consulting cost', sublabel: 'vs. McKinsey or Deloitte' },
]

export const SocialProof = () => (
  <section className="bg-[#0E1117] text-white py-12">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-3 gap-8 text-center">
        {stats.map((stat, index) => (
          <div key={index}>
            <div className="text-4xl md:text-5xl font-mono font-bold text-teal-400">
              {stat.display ? (
                stat.display
              ) : (
                <><CountUp end={stat.value!} duration={3} enableScrollSpy />{stat.value === 100 ? '%' : '+'}</>
              )}
            </div>
            <div className="text-sm text-gray-400 mt-2">{stat.label}</div>
            {stat.sublabel && (
              <div className="text-xs text-gray-500 mt-1">{stat.sublabel}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
)
