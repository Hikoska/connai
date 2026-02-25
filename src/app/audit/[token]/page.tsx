'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface Interview {
  id: string;
  stakeholder_name: string;
  stakeholder_role: string;
  interview_token: string;
  status: 'pending' | 'in_progress' | 'complete';
}

interface Lead {
  id: string;
  org_name: string;
}

interface Dimension {
  name: string;
  score: number;
}

interface ReportPreview {
  completedCount: number;
  totalCount: number;
  dimensions: Dimension[];
  partial: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete ✓',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-400',
  in_progress: 'text-amber-400',
  complete: 'text-teal-400',
};

const SCORE_COLOR = (s: number) =>
  s >= 70 ? 'bg-teal-500' : s >= 40 ? 'bg-amber-500' : 'bg-red-500';

export default function AuditPage() {
  const { token } = useParams<{ token: string }>();

  const [lead, setLead] = useState<Lead | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [report, setReport] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!token) return;

    // 1. Lead by lead_id (the token IS the lead.id)
    const leadRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/leads?id=eq.${token}&select=id,org_name`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      }
    );
    const leads: Lead[] = await leadRes.json();
    if (leads.length) setLead(leads[0]);

    // 2. Interviews for this lead
    const ivRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interviews?lead_id=eq.${token}&select=id,stakeholder_name,stakeholder_role,interview_token,status`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      }
    );
    const ivData: Interview[] = await ivRes.json();
    setInterviews(ivData);

    // 3. Report preview
    const rpRes = await fetch(`/api/report/${token}/preview`);
    if (rpRes.ok) setReport(await rpRes.json());

    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const copyLink = (ivToken: string) => {
    const url = `${window.location.origin}/interview/${ivToken}`;
    navigator.clipboard.writeText(url);
    setCopied(ivToken);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <p className="text-white/40 text-sm animate-pulse">Loading your audit…</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <p className="text-white/40 text-sm">Audit not found.</p>
      </div>
    );
  }

  const completedCount = report?.completedCount ?? 0;
  const totalCount = report?.totalCount ?? interviews.length;
  const dimensions = report?.dimensions ?? [];
  const isPartial = report?.partial ?? true;

  return (
    <div className="min-h-screen bg-[#0E1117] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">

        {/* Header */}
        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Digital Maturity Audit</p>
          <h1 className="text-2xl font-semibold">{lead.org_name}</h1>
          {isPartial && totalCount > 0 && (
            <span className="inline-block mt-2 text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full">
              {completedCount}/{totalCount} interviews complete — refreshing every 30s
            </span>
          )}
          {!isPartial && totalCount > 0 && (
            <span className="inline-block mt-2 text-xs bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full">
              All {totalCount} interviews complete
            </span>
          )}
        </div>

        {/* Stakeholder table */}
        {interviews.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Stakeholders</h2>
            <div className="space-y-2">
              {interviews.map((iv) => (
                <div
                  key={iv.id}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{iv.stakeholder_name}</p>
                    <p className="text-xs text-white/40">{iv.stakeholder_role}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${STATUS_COLORS[iv.status] ?? 'text-gray-400'}`}>
                      {STATUS_LABELS[iv.status] ?? iv.status}
                    </span>
                    <button
                      onClick={() => copyLink(iv.interview_token)}
                      className="text-xs text-white/40 hover:text-white/80 transition-colors border border-white/10 rounded-lg px-2 py-1"
                    >
                      {copied === iv.interview_token ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dimension scores */}
        <div>
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
            {dimensions.length > 0 ? 'Current Scores' : 'Waiting for first response…'}
          </h2>
          {dimensions.length > 0 ? (
            <div className="space-y-4">
              {dimensions.map((d) => (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{d.name}</span>
                    <span className="text-white font-medium">{d.score}/100</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className={`${SCORE_COLOR(d.score)} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm">
              Scores will appear here once the first stakeholder completes their interview.
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="border-t border-white/10 pt-6 text-center">
          <p className="text-white/40 text-xs">
            Want to act on these findings?{' '}
            <a href="mailto:lmamet@linkgrow.io" className="text-teal-400 underline underline-offset-2">
              Book a consultation
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
