'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import BenchmarkingPanel from './benchmarking-panel';

interface Dimension { name: string; score: number; }
interface ReportData {
  leadId: string;
  completedCount: number;
  totalCount: number;
  dimensions: Dimension[];
  partial: boolean;
}
interface ActionItem {
  action: string;
  dimension: string;
  impact: string;
  effort: string;
}
interface ActionPlan {
  quick_wins: ActionItem[];
  six_month: ActionItem[];
  long_term: ActionItem[];
  summary: string;
}

const SCORE_COLOR = (s: number) =>
  s >= 70 ? 'bg-teal-500' : s >= 40 ? 'bg-amber-500' : 'bg-red-500';

const TIER_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  quick_wins:  { label: 'Quick Wins',          color: 'text-teal-400',   desc: 'Start in the next 30 days' },
  six_month:   { label: '6-Month Actions',     color: 'text-amber-400',  desc: 'Plan and execute this quarter' },
  long_term:   { label: 'Strategic (12\u201324 months)', color: 'text-purple-400', desc: 'Requires investment and planning' },
};

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  // URL param used only as optimistic hint (e.g. post-Stripe redirect UX)
  // Canonical paid status is fetched from DB via /api/report/[id]/paid-status
  const paidHint = searchParams.get('paid') === 'true'; // eslint-disable-line @typescript-eslint/no-unused-vars

  const [report, setReport]               = useState<ReportData | null>(null);
  const [orgName, setOrgName]             = useState<string>('');
  const [plan, setPlan]                   = useState<ActionPlan | null>(null);
  const [planLoading, setPlanLoading]     = useState(false);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paid, setPaid]                   = useState(false);
  const [paidChecked, setPaidChecked]     = useState(false);

  // Verify payment status from DB (service-role API route — URL param is not trusted)
  useEffect(() => {
    async function checkPaid() {
      try {
        const res = await fetch(`/api/report/${id}/paid-status`);
        if (res.ok) {
          const { paid: dbPaid } = await res.json();
          setPaid(dbPaid);
        }
      } catch { /* silent — default remains false */ }
      setPaidChecked(true);
    }
    checkPaid();
  }, [id]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/report/${id}/preview`);
      if (!res.ok) { setError('Report not found.'); setLoading(false); return; }
      const data: ReportData = await res.json();
      setReport(data);

      // createClient used INSIDE handler — not at module level (gate rule)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
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

  // Load action plan once both report data and paid status are resolved
  useEffect(() => {
    if (!report || !paidChecked) return;
    if (!report.partial || paid) {
      loadActionPlan();
    }
  }, [report, paid, paidChecked]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadActionPlan = async () => {
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/report/${id}/action-plan`);
      if (res.ok) setPlan(await res.json());
    } catch { /* silent */ }
    setPlanLoading(false);
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      } else {
        alert('Payment unavailable \u2014 please try again.');
      }
    } catch {
      alert('Payment error \u2014 please try again.');
    }
    setCheckoutLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E1117]">
      <p className="text-white/40 text-sm animate-pulse">Building your report\u2026</p>
    </div>
  );

  if (error || !report) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E1117]">
      <p className="text-red-400 text-sm">{error || 'Report unavailable.'}</p>
    </div>
  );

  const { completedCount, totalCount, dimensions, partial } = report;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const overallScore = dimensions.length
    ? Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length)
    : 0;

  return (
    <div className="min-h-screen bg-[#0E1117] text-white print:bg-white print:text-gray-900">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">

        {/* Header */}
        <div className="space-y-1">
          <p className="text-white/30 text-xs uppercase tracking-widest print:text-gray-400">Digital Maturity Report</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{orgName || 'Your Organisation'}</h1>
              {partial && (
                <span className="inline-block mt-2 text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full">
                  Partial \u00b7 {completedCount}/{totalCount} interviews complete
                </span>
              )}
            </div>
            <button
              onClick={() => window.print()}
              className="flex-shrink-0 flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white/70 hover:text-white text-xs px-3 py-2 rounded-lg transition print:hidden"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>

        {/* Overall Score */}
        <div className="bg-white/5 rounded-2xl p-6 text-center print:border print:border-gray-200">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2 print:text-gray-400">Overall Score</p>
          <p className="text-6xl font-bold text-teal-400" data-testid="score">{overallScore}</p>
          <p className="text-white/30 text-sm mt-1 print:text-gray-400">out of 100</p>
          {partial && totalCount > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/30 mb-1 print:text-gray-400">
                <span>Interview progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden print:bg-gray-200">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Dimension Scores */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest print:text-gray-500">Dimensions</h2>
          {dimensions.map((d) => (
            <div key={d.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{d.name}</span>
                <span className="font-medium">{d.score}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden print:bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${SCORE_COLOR(d.score)}`}
                  style={{ width: `${d.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Benchmarking Panel */}
        <BenchmarkingPanel dimensions={dimensions} />

        {/* Action Plan — gated behind DB-verified payment */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest print:text-gray-500">Action Plan</h2>
            {partial && !plan && !planLoading && paid && (
              <button
                onClick={loadActionPlan}
                className="text-xs text-teal-400 hover:text-teal-300 transition print:hidden"
              >
                Generate preview \u2192
              </button>
            )}
          </div>

          {/* Paywall — shown only after DB check confirms unpaid (avoids flash) */}
          {paidChecked && !paid && !partial && (
            <div className="relative rounded-2xl overflow-hidden">
              <div className="blur-sm pointer-events-none select-none opacity-40 space-y-2 py-4">
                {[
                  'Implement a unified data platform across departments',
                  'Launch digital skills training programme for all staff',
                  'Automate top 3 manual reporting processes',
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 bg-white/5 rounded-xl p-3">
                    <div className="flex-1">
                      <p className="text-sm text-white/90">{item}</p>
                      <p className="text-xs text-white/30 mt-0.5">Strategic Priority</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0E1117]/80 backdrop-blur-sm rounded-2xl">
                <div className="text-center px-6 space-y-3">
                  <p className="text-lg font-semibold text-white">Unlock Your Full Action Plan</p>
                  <p className="text-sm text-white/50 max-w-xs">
                    Get a prioritised, AI-generated roadmap tailored to your organisation&apos;s digital maturity gaps.
                  </p>
                  <button
                    onClick={handleUpgrade}
                    disabled={checkoutLoading}
                    className="mt-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-semibold text-sm px-6 py-3 rounded-xl transition print:hidden"
                  >
                    {checkoutLoading ? 'Redirecting\u2026' : 'Get Full Report \u2014 $49'}
                  </button>
                  <p className="text-xs text-white/30">One-time payment \u00b7 Instant access \u00b7 No subscription</p>
                </div>
              </div>
            </div>
          )}

          {planLoading && (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white/30 text-xs">Generating your action plan\u2026</p>
            </div>
          )}

          {plan && paid && (
            <div className="space-y-6">
              {plan.summary && (
                <p className="text-white/60 text-sm italic border-l-2 border-teal-500/50 pl-4">
                  {plan.summary}
                </p>
              )}
              {(['quick_wins', 'six_month', 'long_term'] as const).map((tier) => {
                const items = plan[tier];
                if (!items?.length) return null;
                const { label, color, desc } = TIER_LABELS[tier];
                return (
                  <div key={tier}>
                    <div className="mb-2">
                      <span className={`text-xs font-semibold uppercase tracking-widest ${color}`}>{label}</span>
                      <span className="text-white/30 text-xs ml-2">{desc}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex gap-3 bg-white/5 rounded-xl p-3 print:border print:border-gray-100">
                          <div className="flex-1">
                            <p className="text-sm text-white/90 print:text-gray-900">{item.action}</p>
                            <p className="text-xs text-white/30 mt-0.5 print:text-gray-400">{item.dimension}</p>
                          </div>
                          <div className="flex-shrink-0 flex flex-col items-end gap-1">
                            <span className="text-xs text-white/40 print:text-gray-400">Impact: {item.impact}</span>
                            <span className="text-xs text-white/30 print:text-gray-400">Effort: {item.effort}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!plan && !planLoading && !partial && paid && (
            <div className="text-center py-6 text-white/20 text-sm">
              Action plan unavailable \u2014 report may still be generating.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 pt-6 flex items-center justify-between text-white/20 text-xs print:border-gray-200 print:text-gray-400">
          <span>Powered by Connai</span>
          <a href="/" className="hover:text-white/40 transition print:hidden">connai.linkgrow.io</a>
        </div>

      </div>
    </div>
  );
}
