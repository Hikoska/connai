import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Connai',
  description: 'Terms and conditions for using the Connai platform.',
}

export default function TermsPage() {
  return (
    <div className="bg-[#F8F6F2] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-teal-600 hover:underline text-sm mb-8 block">
          ← Back to Connai
        </Link>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance</h2>
            <p className="text-gray-700">
              By using Connai, you agree to these terms. Connai is operated by Linkgrow Ltd
              (Mauritius). If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. The service</h2>
            <p className="text-gray-700">
              Connai provides an AI-powered digital maturity audit. Starting the audit and
              receiving your initial score is free. Full reports and advanced features are
              available under paid packages. We are currently in beta — features and pricing
              may change.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Your responsibilities</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Provide accurate information during the audit process.</li>
              <li>Do not attempt to reverse-engineer, scrape, or abuse the platform.</li>
              <li>Do not submit confidential data you are not authorised to share.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Intellectual property</h2>
            <p className="text-gray-700">
              Your audit report is yours. The Connai platform, methodology, and software
              remain the property of Linkgrow Ltd.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Disclaimers</h2>
            <p className="text-gray-700">
              Connai provides analysis and recommendations, not legal, financial, or
              regulatory advice. Results are based on information you provide and should
              be validated before making material business decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Limitation of liability</h2>
            <p className="text-gray-700">
              To the extent permitted by law, Linkgrow Ltd is not liable for indirect,
              incidental, or consequential damages arising from your use of Connai.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Governing law</h2>
            <p className="text-gray-700">
              These terms are governed by the laws of Mauritius.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contact</h2>
            <p className="text-gray-700">
              Questions about these terms?{' '}
              <a href="mailto:legal@linkgrow.io" className="text-teal-600 hover:underline">legal@linkgrow.io</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
