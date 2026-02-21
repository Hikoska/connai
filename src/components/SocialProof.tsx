'use client'
import CountUp from 'react-countup'

const stats = [
  { value: 1200, label: 'Audits completed' },
  { value: 94, label: '% accuracy on transcripts' },
  { value: 42, label: '% of traditional consultant cost' },
]

export const SocialProof = () => (
  <section className="bg-[#0E1117] text-white py-12">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-3 gap-8 text-center">
        {stats.map((stat, index) => (
          <div key={index}>
            <div className="text-4xl md:text-5xl font-mono font-bold text-teal-400">
              <CountUp end={stat.value} duration={3} enableScrollSpy />+
            </div>
            <div className="text-sm text-gray-400 mt-2">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
)
