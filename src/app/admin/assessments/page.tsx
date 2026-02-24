import { NextRequest } from 'next/server'

// This is a server component, so we can use env vars directly
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

interface Assessment {
  id: string
  stakeholder_email: string
  organisation: string
  country: string
  industry: string
  status: string
  created_at: string
  report: {
    dimensions: { [key: string]: number }
    pdf_url: string
  } | null
}

async function getAssessments(): Promise<Assessment[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase credentials are not configured on the server.')
    return []
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/interviews?select=*,reports(*)`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    console.error('Failed to fetch assessments from Supabase:', await response.text())
    return []
  }

  const data = await response.json()
  return data.map((item: any) => ({
    ...item,
    report: item.reports.length > 0 ? item.reports[0] : null
  }))
}

const calculateOverallScore = (dimensions: { [key: string]: number } | null): string => {
    if (!dimensions) return 'N/A'
    const scores = Object.values(dimensions)
    if (scores.length === 0) return 'N/A'
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    return avg.toFixed(1)
}

export default async function AdminAssessmentsPage({ searchParams }: { searchParams: { key?: string } }) {

  if (searchParams.key !== ADMIN_PASSWORD) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You must provide the correct admin key in the query string.</p>
      </div>
    )
  }
  
  const assessments = await getAssessments()

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-4">All Assessments</h1>
      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Organisation</th>
              <th className="p-3 text-left">Stakeholder</th>
              <th className="p-3 text-left">Industry</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Score</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Report</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {assessments.map((assessment) => (
              <tr key={assessment.id}>
                <td className="p-3 font-medium">{assessment.organisation}</td>
                <td className="p-3">{assessment.stakeholder_email}</td>
                <td className="p-3">{assessment.industry || 'N/A'}</td>
                <td className="p-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {assessment.status}
                  </span>
                </td>
                <td className="p-3 font-mono">{calculateOverallScore(assessment.report?.dimensions)}</td>
                <td className="p-3">{new Date(assessment.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  {assessment.report?.pdf_url ? (
                    <a href={assessment.report.pdf_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                      View PDF
                    </a>
                  ) : (
                    'Not generated'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assessments.length === 0 && <p className="p-4 text-center text-gray-500">No assessments found.</p>}
      </div>
    </div>
  )
}
