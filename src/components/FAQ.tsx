'use client'
import { useState } from 'react'

const faqItems = [
  {
    q: "What is a digital maturity assessment?",
    a: "It's a 'health check' for your business. We analyse how well you're using digital tools and technology to meet your goals, showing you what's working, what's not, and how you compare to others in our region.",
  },
  {
    q: "How is Connai different from other tools?",
    a: "Many tools are generic questionnaires built for large corporations. Connai is a quick, AI-powered conversational interview designed for the reality of SMEs in Mauritius and Africa. It's faster, more personal, and gives you more relevant insights.",
  },
  {
    q: "How long does the interview take?",
    a: "The main interview takes about 30 minutes. It's fast and can be done right from your phone or computer at a time that suits you.",
  },
  {
    q: "What do I get in the report?",
    a: "You get a clear, easy-to-understand report showing your digital maturity score, where your biggest gaps are, and a simple, prioritised action plan with steps you can take immediately to improve.",
  },
  {
    q: "What does it cost?",
    a: "Your first assessment and initial report are completely free. We want you to see the value first. We offer more detailed analysis and team-wide assessments as an affordable paid service, designed for SME budgets.",
  },
]

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const openChat = () => {
    window.dispatchEvent(new CustomEvent('connai:open-chat'))
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold font-serif">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {(faqItems ?? []).map((item, index) => (
            <div key={index} className="border-b border-gray-200 pb-4">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex justify-between items-center text-lg font-semibold text-gray-800 text-left"
              >
                <span>{item.q}</span>
                <span className="text-2xl text-teal-500">{openIndex === index ? '\u2212' : '+'}</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-40 mt-4' : 'max-h-0'}`}>
                <p className="text-gray-600">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center mt-8 text-gray-500">
          Have a different question?{' '}
          <button
            onClick={openChat}
            className="font-semibold text-teal-600 hover:text-teal-500 underline underline-offset-2 transition-colors"
          >
            Ask Connai →
          </button>
        </p>
      </div>
    </section>
  )
}
