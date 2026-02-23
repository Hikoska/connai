const stats = [
  { value: 70, label: 'Faster decisions (McKinsey)', unit: '%' },
  { value: 17, label: 'Higher profitability (McKinsey)', unit: '%' },
  { value: 215, label: 'Higher revenue growth (Gartner)', unit: '%' },
]

export const SocialProof = () => (
  <section className="bg-[#0E1117] text-white py-12">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-3 gap-8 text-center">
        {stats.map((stat, index) => (
          <div key={index}>
            <div className="text-4xl md:text-5xl font-mono font-bold text-teal-400">
              {stat.value}{stat.unit}
            </div>
            <p className="text-gray-400 mt-2 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)
