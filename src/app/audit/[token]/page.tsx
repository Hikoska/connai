'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface Interview {
  id: string;
  stakeholder_name: string;
  stakeholder_role: string;
  token: string;
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

    // 1. Lead by id
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

    // 2. Interviews for this lead — select 'token' (not 'interview_token')
    const ivRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interviews?lead_id=eq.${token}&select=id,stakeholder_name,stakeholder_role,token,status`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      }
    );
    const ivData: Interview[] = await ivRes.json();
    setInterviews(Array.isArray(ivData) ? ivData : []);

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
        <p className="text-gray-400 text-sm">Loading audit…</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <p className="text-red-400 text-sm">Audit not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1117] text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="inline-block bg-teal-900/40 text-teal-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">Digital Maturity Audit</div>
          <h1 className="text-2xl font-bold">{lead.org_name}</h1>
          <p className="text-gray-400 text-sm mt-1">Share the links below with each team member to collect their interview.</p>
        </div>

        {/* Interview links */}
        <div className="space-y-3 mb-10">
          {interviews.length === 0 && (
            <p className="text-gray-500 text-sm">No interview links yet. They will appear here once set up.</p>
          )}
          {interviews.map((iv) => (
            <div key={iv.id} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">{iv.stakeholder_name}</p>
                <p className="text-gray-400 text-xs">{iv.stakeholder_role}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${STATUS_COLORS[iv.status] ?? 'text-gray-400'}`}>
                  {STATUS_LABELS[iv.status] ?? iv.status}
                </span>
                <button
                  onClick={() => copyLink(iv.token)}
                  className="text-xs bg-teal-900/40 hover:bg-teal-800/60 text-teal-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copied === iv.token ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Report preview — only shown once at least one interview is complete */}
        {report && report.completedCount > 0 && (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
            <h2 className="font-semibold mb-1">Early results</h2>
            <p className="text-gray-400 text-xs mb-4">
              {report.completedCount} of {report.totalCount} interviews complete
              {report.partial ? ' — partial view' : ''}
            </p>
            {report.dimensions.map((d) => (
              <div key={d.name} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{d.name}</span>
                  <span className="text-gray-400">{d.score}/100</span>
                </div>
                <div className="w-full bg-[#21262D] rounded-full h-1.5">
                  <div className={`${SCORE_COLOR(d.score)} h-1.5 rounded-full`} style={{ width: `${d.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
