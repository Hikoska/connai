'use client'
import { useState } from 'react'
import { useScrollReveal } from '@/lib/useScrollReveal'

const steps = [
  { 
    title: "1. Brief the AI", 
    description: "In a short, 5-minute conversation, you'll provide Connai with the context it needs: your organisation's size, key departments, and what you hope to achieve. This ensures the audit is tailored to your specific needs.",
  },
  { 
    title: "2. AI Conducts Interviews", 
    description: "Connai's AI will conduct interviews with relevant team members simultaneously and at scale. It ensures 100% transcript fidelity, asks intelligent follow-up questions, and operates without the fatigue or bias of a human consultant.",
  },
  { 
    title: "3. Receive Your Report", 
    description: "Within days, not months, you'll receive a comprehensive digital maturity report. It includes a quantifiable score, benchmarks against your industry, a detailed gap analysis, and a prioritized, actionable roadmap for improvement.",
  },
]

export const HowItWorks = () => {
  const [openIndex, setOpenIndex] = useState(0)
  const sectionRef = useScrollReveal<HTMLDivElement>()

  return (
    <section className="py-20 bg-[#F8F6F2]">
      <div ref={sectionRef} className="scroll-hidden max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold font-serif mb-4">How it works</h2>
        <p className="text-gray-500 mb-12">From briefing to a full report in three simple steps.</p>
        <div className="space-y-4 text-left">
          {steps.map((step, index) => (
            <div key={index} className="border-b border-gray-200 pb-4">
              <button 
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                className="w-full flex justify-between items-center text-xl font-semibold text-gray-800"
              >
                <span>{step.title}</span>
                <span>{openIndex === index ? '\u2212' : '+'}</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-40 mt-4' : 'max-h-0'}`}>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
