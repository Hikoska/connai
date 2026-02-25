'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function sbGet(table: string, params: Record<string, string>) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${q}`, {
    headers: {
      apikey: SB_ANON,
      Authorization: `Bearer ${SB_ANON}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) return null
  const rows = await res.json()
  return Array.isArray(rows) ? rows[0] ?? null : null
}

export default function ReportPage() {
  const { lead_id } = useParams<{ lead_id: string }>()
  const [lead, setLead] = useState<{ org_name?: string; email?: string; industry?: string } | null>(null)
  const [interview, setInterview] = useState<{ status?: string; created_at?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!lead_id) return
    ;(async () => {
      try {
        const [leadData, ivData] = await Promise.all([
          sbGet('leads', { id: `eq.${lead_id}`, select: 'org_name,email,industry' }),
          sbGet('interviews', {
            lead_id: `eq.${lead_id}`,
            select: 'status,created_at',
            order: 'created_at.desc',
            limit: '1',
          }),
        ])
        setLead(leadData)
        setInterview(ivData)
      } catch {
        setError('Unable to load your report. Please try refreshing.')
      } finally {
        setLoading(false)
      }
    })()
  }, [lead_id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#0D5C63]" />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-gray-500">{error || 'Report not found.'}</p>
        </div>
      </div>
    )
  }

  const isComplete = interview?.status === 'completed'
  const dateStr = interview?.created_at
    ? new Date(interview.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="text-[#0D5C63] font-bold text-xl tracking-tight">Connai</span>
          <span className="text-xs text-gray-400 uppercase tracking-widest">Digital Maturity Report</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Org + date */}
        <div className="mb-2">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Assessment for</p>
          <h1 className="text-3xl font-bold text-gray-900">
            {lead.org_name ?? 'Your Organisation'}
          </h1>
          {lead.industry && (
            <p className="text-sm text-gray-400 mt-1">{lead.industry}</p>
          )}
          {dateStr && (
            <p className="text-sm text-gray-400 mt-1">{dateStr}</p>
          )}
        </div>

        <div className="my-10 h-px bg-gray-200" />

        {isComplete ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#0D5C63]/10 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-7 h-7 text-[#0D5C63]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Your report is being prepared
            </h2>
            <p className="text-gray-500 leading-relaxed max-w-sm mx-auto">
              Our AI is analysing your responses across all 8 dimensions of digital maturity.
              Your personalised report will be delivered to{' '}
              {lead.email ? (
                <span className="font-medium text-gray-700">{lead.email}</span>
              ) : (
                 'your inbox'
              )}{' '}
              shortly.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 text-sm text-gray-400">
              <span className="w-2 h-2 rounded-full bg-[#0D5C63] animate-pulse" />
              Analysis in progress
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-7 h-7 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Assessment in progress
            </h2>
            <p className="text-gray-500 leading-relaxed max-w-sm mx-auto">
              Complete your Digital Maturity Assessment interview to receive your
              personalised report.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
