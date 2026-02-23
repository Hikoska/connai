'use client'

type Stat = {
  display: string
  label: string
  sublabel: string
}

const stats: Stat[] = [
  {
    display: '70%',
    label: 'Of digital transformations fail to meet their goals',
    sublabel: 'McKinsey Global Survey'
  },
  {
    display: '17%',
    label: "Of large IT projects threaten the company's existence",
    sublabel: 'via budget overruns \u2014 McKinsey'
  },
  {
    display: '215%',
    label: 'Average cost overrun on large IT projects',
    sublabel: 'Gartner Research'
  },
]

export const SocialProof = () => (
  <section className="bg-[#0E1117] text-white py-16">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
        {stats.map((stat, index) => (
          <div key={index}>
            <div className="text-5xl md:text-6xl font-mono font-bold text-teal-400">
              {stat.display}
            </div>
            <div className="text-sm text-gray-300 mt-3 font-medium">{stat.label}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.sublabel}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
)
