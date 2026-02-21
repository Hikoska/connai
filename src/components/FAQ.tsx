'use client'
import { useState } from 'react'

const faqItems = [
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted in transit and at rest. We are GDPR compliant and your audit data is never used for training AI models.",
  },
  {
    q: "How long does it take?",
    a: "The initial conversation with Connai takes about 30 minutes. You'll receive your full, comprehensive report within 2-3 business days.",
  },
  {
    q: "What do I get at the end?",
    a: "You receive a multi-page digital maturity report that includes your overall score, industry benchmarks, a detailed gap analysis, and a prioritized action plan.",
  },
  {
    q: "Is it free?",
    a: "Starting the conversation and receiving your initial maturity score is completely free, with no credit card required. Deeper sections of the report are part of our paid packages.",
  },
  {
    q: "How is this different from a consultant?",
    a: "Connai is faster, more affordable, and provides 100% data fidelity. We can interview 100 people in the time a consultant interviews 5, giving you a much broader and more accurate picture of your organisation.",
  },
  {
    q: "Can my whole team take it?",
    a: "Yes. Our paid packages allow you to run audits across specific departments or your entire organisation to get a complete 360-degree view.",
  },
]

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold font-serif">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="border-b border-gray-200 pb-4">
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex justify-between items-center text-lg font-semibold text-gray-800 text-left"
              >
                <span>{item.q}</span>
                <span className="text-2xl text-teal-500">{openIndex === index ? '−' : '+'}</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-40 mt-4' : 'max-h-0'}`}>
                <p className="text-gray-600">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center mt-8 text-gray-500">
          Have a different question? <button className="font-semibold text-teal-600">Ask Connai →</button>
        </p>
      </div>
    </section>
  )
}
