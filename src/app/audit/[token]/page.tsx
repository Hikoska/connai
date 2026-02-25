'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface Lead {
  id: string;
  org_name: string;
}

interface DimensionScore {
  dimension: string;
  score: number;
}

interface Report {
  scores?: DimensionScore[];
  partial?: boolean;
}

export default function AuditPage() {
  const { token } = useParams<{ token: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .select('lead_id')
        .eq('interview_token', token)
        .single();

      if (interviewError || !interviewData) {
        setLoading(false);
        return;
      }

      const { data: leadData } = await supabase
        .from('leads')
        .select('id, org_name')
        .eq('id', interviewData.lead_id)
        .single();

      setLead(leadData);

      const res = await fetch(`/api/report/${interviewData.lead_id}/preview`);
      if (res.ok) {
        const reportData = await res.json();
        setReport(reportData);
      }

      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <p className="text-white/60 text-sm">Loading your report...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <p className="text-white/60 text-sm">Report not found.</p>
      </div>
    );
  }

  const scores = report?.scores ?? [];
  const isPartial = report?.partial ?? true;

  return (
    <div className="min-h-screen bg-[#0E1117] text-white px-6 py-12 max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Digital Maturity Report</p>
        <h1 className="text-2xl font-semibold">{lead.org_name}</h1>
        {isPartial && (
          <span className="inline-block mt-2 text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full">
            Collecting responses — refreshing automatically
          </span>
        )}
      </div>

      {scores.length > 0 ? (
        <div className="space-y-4">
          {scores.map((item) => (
            <div key={item.dimension}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70">{item.dimension}</span>
                <span className="text-white font-medium">{item.score}/100</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-[#0097e6] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-white/40 text-sm text-center py-12">
          Report is being generated. This page refreshes every 30 seconds.
        </div>
      )}
    </div>
  );
}
