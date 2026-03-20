'use client'
import { useState } from 'react'

const faqItems = [
  {
    q: "What is a digital maturity assessment?",
    a: "It's a 'health check' for your business. We analyse how well you're using digital tools and technology to meet your goals, showing you what's working, what's not, and how you compare to others in your industry.",
  },
  {
    q: "How is Connai different from other tools?",
    a: "Many tools are generic questionnaires built for large corporations. Connai is a quick, AI-powered conversational interview built for the reality of growing organisations. It's faster, more personal, and gives you more actionable insights.",
  },
  {
    q: "How long does the interview take?",
    a: "The main interview takes about 20 minutes. It's fast and can be done right from your phone or computer at a time that suits you.",
  },
  {
    q: "What do I get in the report?",
    a: "You get a clear, easy-to-understand report showing your digital maturity score, where your biggest gaps are, and a simple, prioritised action plan with steps you can take immediately to improve.",
  },
  {
    q: "What does it cost?",
    a: "Your first assessment and initial report are completely free. We want you to see the value first. We offer more detailed analysis and team-wide assessments as an affordable paid service, designed for growing teams.",
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
          {(faqItems ?? []).map((item, index) => {
            const panelId = `faq-panel-${index}`
            const buttonId = `faq-btn-${index}`
            const isOpen = openIndex === index
            return (
              <div key={index} className="border-b border-gray-200 pb-4">
                <button
                  type="button"
                  id={buttonId}
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex justify-between items-center text-lg font-semibold text-gray-800 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
                >
                  <span>{item.q}</span>
                  <span className="text-2xl text-teal-500">{isOpen ? '\u2212' : '+'}</span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 mt-4' : 'max-h-0'}`}
                >
                  <p className="text-gray-600">{item.a}</p>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-center mt-8 text-gray-500">
          Have a different question?{' '}
          <button
            type="button"
            onClick={openChat}
            className="font-semibold text-teal-600 hover:text-teal-500 underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
          >
            Ask Connai &rarr;
          </button>
        </p>
      </div>
    </section>
  )
}
