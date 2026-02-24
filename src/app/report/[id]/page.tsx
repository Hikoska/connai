'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Dimension { name: string; score: number; }
interface ReportData {
  leadId: string;
  completedCount: number;
  totalCount: number;
  dimensions: Dimension[];
  partial: boolean;
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      // Fetch report preview
      const res = await fetch(`/api/report/${id}/preview`);
      if (!res.ok) { setError('Report not found.'); setLoading(false); return; }
      const data: ReportData = await res.json();
      setReport(data);

      // Fetch org name from leads table
      const { data: lead } = await supabase
        .from('leads')
        .select('org_name')
        .eq('id', id)
        .single();
      if (lead?.org_name) setOrgName(lead.org_name);

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm animate-pulse">Building your report…</p>
    </div>
  );

  if (error || !report) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-red-400 text-sm">{error || 'Report unavailable.'}</p>
    </div>
  );

  const { completedCount, totalCount, dimensions, partial } = report;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Digital Maturity Report
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {orgName || 'Your Organisation'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Based on {completedCount} of {totalCount} stakeholder interview{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Partial banner */}
        {partial && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <span className="text-amber-500 text-lg">⏳</span>
            <p className="text-amber-800 text-sm font-medium">
              Partial report — {completedCount} of {totalCount} stakeholders interviewed. Final scores will update as more responses come in.
            </p>
          </div>
        )}

        {/* Interview progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Interview completion</span>
            <span className="text-sm font-semibold text-[#0D5C63]">{progressPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0D5C63] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">{completedCount} of {totalCount} completed</p>
        </div>

        {/* Dimension scores */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Maturity by dimension</h2>
          <div className="space-y-4">
            {dimensions.map((dim) => (
              <div key={dim.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{dim.name}</span>
                  <span className="text-sm font-semibold text-[#0D5C63]">
                    {dim.score > 0 ? `${dim.score}/5` : '—'}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(dim.score / 5) * 100}%`,
                      backgroundColor: '#0D5C63',
                      opacity: dim.score > 0 ? 1 : 0,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {completedCount === 0 && (
            <p className="text-xs text-gray-400 mt-4 text-center">Scores will appear once the first interview is completed.</p>
          )}
        </div>

      </div>
    </div>
  );
}
