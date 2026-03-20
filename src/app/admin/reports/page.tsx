'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Report {
  id: string
  lead_id: string
  overall_score: number | null
  dimension_scores: Record<string, number> | null
  created_at: string
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('connai_admin_authed') !== '1') {
      router.push('/admin')
      return
    }
    fetch('/api/admin/reports')
      .then(r => r.json())
      .then((data: Report[]) => {
        setReports(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load reports')
        setLoading(false)
      })
  }, [router])

  function dimCount(scores: Record<string, number> | null): string {
    if (!scores) return '\u2014'
    const entries = Object.entries(scores)
    return `${entries.length} dims`
  }

  function scoreColor(score: number | null): string {
    if (score === null) return 'text-gray-400'
    if (score >= 71) return 'text-teal-400'
    if (score >= 51) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Reports</h1>
          <a href="/admin" className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded">
            \u2190 Admin
          </a>
        </div>
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow">
          {loading ? (
            <div className="p-8 text-center text-gray-400 animate-pulse">Loading reports\u2026</div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">{error}</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No reports found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3 font-medium">Report ID</th>
                  <th className="px-4 py-3 font-medium">Lead ID</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Dimensions</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">View</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((rep, i) => (
                  <tr
                    key={rep.id}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                      i % 2 === 0 ? '' : 'bg-gray-800/50'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-gray-200">{rep.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-mono text-gray-200">{rep.lead_id?.slice(0, 8) ?? '\u2014'}</td>
                    <td className={`px-4 py-3 font-bold ${scoreColor(rep.overall_score)}`}>
                      {rep.overall_score !== null ? `${rep.overall_score}/100` : '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-gray-200">{dimCount(rep.dimension_scores)}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(rep.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/report/${rep.lead_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-400 hover:text-teal-300 transition-colors text-xs underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-400 rounded"
                      >
                        View \u2192
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-4 text-xs text-gray-500">{reports.length} report{reports.length !== 1 ? 's' : ''} total</p>
      </div>
    </div>
  )
}
