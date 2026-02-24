'use client'
import { BarChart3, Target, Telescope, CheckCircle } from 'lucide-react'
import { useScrollReveal } from '@/lib/useScrollReveal'

const outcomes = [
  {
    icon: <BarChart3 size={32} className="text-teal-500" />,
    title: "AI Maturity Score",
    description: "Get a single, quantifiable score that benchmarks your organisation's current digital maturity against your industry.",
  },
  {
    icon: <Telescope size={32} className="text-teal-500" />,
    title: "Sector & Role Benchmarks",
    description: "See how your teams and processes stack up against top performers in your specific sector and region.",
  },
  {
    icon: <Target size={32} className="text-teal-500" />,
    title: "Gap Analysis",
    description: "Pinpoint the exact areas where you're lagging, from operational inefficiencies to missed customer opportunities.",
  },
  {
    icon: <CheckCircle size={32} className="text-teal-500" />,
    title: "Prioritised Action Plan",
    description: "Receive a clear, actionable roadmap with prioritised steps to close your gaps and accelerate your digital transformation.",
  },
]

export const WhatYouGet = () => {
  const headingRef = useScrollReveal<HTMLDivElement>()
  const gridRef = useScrollReveal<HTMLDivElement>({ threshold: 0.08 })

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div ref={headingRef} className="scroll-hidden text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl font-bold font-serif">What You Get</h2>
          <p className="text-gray-500 mt-4">A complete, actionable picture of your digital standing.</p>
        </div>
        <div ref={gridRef} className="scroll-stagger grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {outcomes.map((item, index) => (
            <div key={index} className="bg-[#F8F6F2] p-6 rounded-lg">
              <div className="mb-4">{item.icon}</div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
