import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: { token: string }
}

export default async function InterviewCompletePage({ params }: Props) {
  const { token } = params
  const supabase = createClient()

  // Fetch interview record
  const { data: interview } = await supabase
    .from('interviews')
    .select('lead_id, stakeholder_email, stakeholder_name, status')
    .eq('token', token)
    .single()

  let orgName = ''
  let leadId = ''

  if (interview?.lead_id) {
    leadId = interview.lead_id
    const { data: lead } = await supabase
      .from('leads')
      .select('org_name')
      .eq('id', interview.lead_id)
      .single()
    if (lead?.org_name) orgName = lead.org_name
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <p className="text-gray-800 font-semibold">Interview not found</p>
          <p className="text-gray-500 text-sm">This link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 text-center">
        {/* Check icon */}
        <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">Thank you!</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {interview.stakeholder_name
              ? `Your input has been recorded, ${interview.stakeholder_name}.`
              : 'Your input has been recorded.'}
            {orgName ? ` It will be included in the ${orgName} digital maturity assessment.` : ''}
          </p>
        </div>

        {/* What happens next */}
        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">What happens next</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5 flex-shrink-0">✓</span>
              <span>Your responses have been securely submitted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5 flex-shrink-0">✓</span>
              <span>The assessment report will be generated once all stakeholders have responded</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5 flex-shrink-0">✓</span>
              <span>You may receive a copy of the report by email</span>
            </li>
          </ul>
        </div>

        {/* CTA — only show report link if leadId known */}
        {leadId && (
          <Link
            href={`/report/${leadId}`}
            className="inline-block w-full bg-[#0D5C63] hover:bg-[#0a4a50] text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors"
          >
            View the report
          </Link>
        )}

        <p className="text-xs text-gray-400">
          You can close this tab.
        </p>
      </div>
    </div>
  )
}
