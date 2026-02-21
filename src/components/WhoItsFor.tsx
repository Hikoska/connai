const personas = [
  {
    title: "I'm a Business Owner",
    description: "Get a clear, top-down view of your entire organisation's digital health without the cost and time of a traditional consultancy.",
    painPoint: "Struggling to connect digital spend to real business outcomes.",
  },
  {
    title: "I Lead a Team",
    description: "Pinpoint the specific tools and process gaps holding your department back, and get a data-backed case for improvement.",
    painPoint: "Fighting for budget without objective data to prove the need.",
  },
  {
    title: "I Work in Digital",
    description: "Benchmark your operations against the industry and identify the highest-impact projects to drive your digital strategy forward.",
    painPoint: "Unsure where to focus your efforts for the biggest wins.",
  },
]

export const WhoItsFor = () => (
  <section className="py-20 bg-[#F8F6F2]">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-4xl font-bold font-serif">Who It's For</h2>
        <p className="text-gray-500 mt-4">Whether you're leading the company or the charge on digital.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {personas.map((item, index) => (
          <div key={index} className="bg-white p-8 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="font-bold text-xl mb-3">{item.title}</h3>
            <p className="text-gray-600 mb-4">{item.description}</p>
            <p className="text-sm text-teal-700 italic">"{item.painPoint}"</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)
