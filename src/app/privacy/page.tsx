import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Connai',
  description: 'How Connai collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="bg-[#F8F6F2] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-teal-600 hover:underline text-sm mb-8 block">
          ← Back to Connai
        </Link>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Who we are</h2>
            <p className="text-gray-700">
              Connai is operated by Linkgrow Ltd, a company registered in Mauritius.
              We provide an AI-powered digital maturity audit platform.
              For any privacy-related questions, contact us at{' '}
              <a href="mailto:privacy@linkgrow.io" className="text-teal-600 hover:underline">privacy@linkgrow.io</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. What data we collect</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Information you provide during the audit conversation (organisation name, role, department details).</li>
              <li>Usage data: pages visited, session duration, interactions with the chat interface.</li>
              <li>Technical data: IP address, browser type, device type.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How we use your data</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>To conduct your digital maturity audit and generate your report.</li>
              <li>To improve the accuracy and quality of our assessments.</li>
              <li>To communicate with you about your audit results.</li>
            </ul>
            <p className="text-gray-700 mt-3 font-medium">
              Your audit data is never used to train AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data security</h2>
            <p className="text-gray-700">
              All data is encrypted in transit (TLS) and at rest. We use Supabase for
              data storage, which provides enterprise-grade security. We are GDPR compliant.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Your rights</h2>
            <p className="text-gray-700">
              Under GDPR, you have the right to access, correct, or delete your personal data.
              To exercise any of these rights, email{' '}
              <a href="mailto:privacy@linkgrow.io" className="text-teal-600 hover:underline">privacy@linkgrow.io</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
            <p className="text-gray-700">
              We use minimal, functional cookies required to operate the service.
              We use Vercel Analytics to understand site usage in aggregate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Changes to this policy</h2>
            <p className="text-gray-700">
              We may update this policy as the product evolves. We will notify active
              users of material changes by email.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
