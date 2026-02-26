'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

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

const INDUSTRY_MEDIANS: Record<string, number> = {
  'Digital Strategy & Leadership': 48,
  'Customer Experience & Digital Channels': 52,
  'Operations & Process Automation': 44,
  'Data & Analytics': 47,
  'Technology Infrastructure': 53,
  'Talent & Digital Culture': 41,
  'Innovation & Agile Delivery': 38,
  'Cybersecurity & Risk': 46,
};

const DIMENSION_ICONS: Record<string, string> = {
  'Digital Strategy & Leadership': '🧭',
  'Customer Experience & Digital Channels': '🤝',
  'Operations & Process Automation': '⚙️',
  'Data & Analytics': '📊',
  'Technology Infrastructure': '🏗️',
  'Talent & Digital Culture': '🧠',
  'Innovation & Agile Delivery': '🚀',
  'Cybersecurity & Risk': '🔐',
};

const TIER_META = {
  quick_wins: { label: 'Quick Wins',              color: 'text-teal-400',   border: 'border-teal-500/30',   desc: 'Start in the next 30 days'           },
  six_month:  { label: '6-Month Actions',          color: 'text-amber-400',  border: 'border-amber-500/30',  desc: 'Plan and execute this quarter'        },
  long_term:  { label: 'Strategic (12\u201324 months)', color: 'text-purple-400', border: 'border-purple-500/30', desc: 'Requires investment and planning'  },
} as const;

function getMaturityTier(score: number) {
  if (score >= 91) return { label: 'Digital Leader',   color: 'text-yellow-300', bg: 'bg-yellow-900/20 border-yellow-500/30' };
  if (score >= 76) return { label: 'Advanced',         color: 'text-teal-300',   bg: 'bg-teal-900/20 border-teal-500/30'   };
  if (score >= 61) return { label: 'Established',      color: 'text-blue-300',   bg: 'bg-blue-900/20 border-blue-500/30'   };
  if (score >= 41) return { label: 'Developing',       color: 'text-amber-300',  bg: 'bg-amber-900/20 border-amber-500/30' };
  if (score >= 21) return { label: 'Emerging',         color: 'text-orange-300', bg: 'bg-orange-900/20 border-orange-500/30' };
  return              { label: 'Digitally Dormant', color: 'text-red-300',   bg: 'bg-red-900/20 border-red-500/30'     };
}

function barColor(s: number) {
  return s >= 70 ? 'bg-teal-500' : s >= 40 ? 'bg-amber-500' : 'bg-red-500';
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _paidHint = searchParams.get('paid') === 'true';

  const [report, setReport]                       = useState<ReportData | null>(null);
  const [orgName, setOrgName]                     = useState('');
  const [industry, setIndustry]                   = useState('');
  const [summary, setSummary]                     = useState('');
  const [summaryLoading, setSummaryLoading]       = useState(false);
  const [plan, setPlan]                           = useState<ActionPlan | null>(null);
  const [planLoading, setPlanLoading]             = useState(false);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState('');
  const [checkoutLoading, setCheckoutLoading]     = useState(false);
  const [paid, setPaid]                           = useState(false);
  const [paidChecked, setPaidChecked]             = useState(false);

  useEffect(() => {
    fetch(`/api/report/${id}/paid-status`)
      .then(r => r.ok ? r.json() : { paid: false })
      .then(({ paid: p }) => { setPaid(p); setPaidChecked(true); })
      .catch(() => setPaidChecked(true));
  }, [id]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/report/${id}/preview`);
      if (!res.ok) { setError('Report not found.'); setLoading(false); return; }
      const data: ReportData = await res.json();
      setReport(data);
      // createClient inside handler — gate rule compliant (no module-level usage)
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: lead } = await sb.from('leads').select('org_name, industry').eq('id', id).single();
      if (lead?.org_name) setOrgName(lead.org_name);
      if (lead?.industry) setIndustry(lead.industry);
      setLoading(false);
    }
    load();
  }, [id]);

  // Executive summary — free tier
  useEffect(() => {
    if (!report || report.partial) return;
    setSummaryLoading(true);
    fetch(`/api/report/${id}/executive-summary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.summary) setSummary(d.summary); })
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [report, id]);

  // Action plan — paid tier only
  useEffect(() => {
    if (!report || !paidChecked || report.partial || !paid) return;
    setPlanLoading(true);
    fetch(`/api/report/${id}/action-plan`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPlan(d); })
      .catch(() => {})
      .finally(() => setPlanLoading(false));
  }, [report, paid, paidChecked, id]);

  const overallScore = report
    ? Math.round(report.dimensions.reduce((s, d) => s + d.score, 0) / Math.max(report.dimensions.length, 1))
    : 0;
  const tier = getMaturityTier(overallScore);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch { /* silent */ }
    setCheckoutLoading(false);
  };

  const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const strong     = report?.dimensions.filter(d => d.score >= 70) ?? [];
  const developing = report?.dimensions.filter(d => d.score >= 40 && d.score < 70) ?? [];
  const critical   = report?.dimensions.filter(d => d.score < 40) ?? [];

  if (loading) return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="h-6 w-20 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
        <div className="h-10 w-60 bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-5">
          <div className="h-52 bg-slate-800 rounded-2xl animate-pulse" />
          <div className="h-52 bg-slate-800 rounded-2xl animate-pulse" />
        </div>
        <div className="h-36 bg-slate-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="text-center space-y-4">
        <p className="text-slate-400 text-lg">{error}</p>
        <a href="/" className="text-teal-400 hover:text-teal-300 text-sm underline">← Back to Connai</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="border-b border-slate-800/60 px-6 py-4 sticky top-0 bg-slate-950/90 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-teal-400 font-bold text-base tracking-tight">Connai</span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-500 text-xs">Digital Maturity Report</span>
          </div>
          <span className="text-slate-600 text-xs">Built by Linkgrow</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Hero */}
        <section>
          <p className="text-teal-600 text-xs font-mono uppercase tracking-widest mb-2">Digital Maturity Assessment</p>
          <h1 className="text-3xl font-bold text-white">{orgName || 'Your Organisation'}</h1>
          {industry && <p className="text-slate-500 text-sm mt-1">{industry}</p>}
          <p className="text-slate-600 text-xs mt-1">Generated {reportDate}</p>
        </section>

        {/* Score + Tier */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={overallScore >= 70 ? '#14b8a6' : overallScore >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(overallScore / 100) * 314} 314`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold tabular-nums">{overallScore}</span>
                <span className="text-slate-500 text-xs">/ 100</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm">Overall Maturity Score</p>
          </div>

          <div className={`${tier.bg} border rounded-2xl p-8 flex flex-col justify-between`}>
            <div>
              <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-2">Maturity Tier</p>
              <p className={`text-2xl font-bold ${tier.color}`}>{tier.label}</p>
            </div>
            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Overall score</span>
                <span>{overallScore}/100</span>
              </div>
              <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor(overallScore)}`}
                  style={{ width: `${overallScore}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Executive Summary */}
        {!report?.partial && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-4">Executive Summary</p>
            {summaryLoading ? (
              <div className="space-y-2.5">
                {['w-full', 'w-5/6', 'w-4/5', 'w-full', 'w-3/4'].map((w, i) => (
                  <div key={i} className={`h-4 bg-slate-800 rounded animate-pulse ${w}`} />
                ))}
              </div>
            ) : summary ? (
              <div className="text-slate-300 text-[15px] leading-relaxed whitespace-pre-line">{summary}</div>
            ) : (
              <p className="text-slate-600 text-sm italic">Generating summary…</p>
            )}
          </section>
        )}

        {/* Dimension Breakdown */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Dimension Breakdown</h2>
            <span className="text-slate-600 text-xs">{report?.dimensions.length ?? 0} dimensions</span>
          </div>

          {[
            { group: 'Strengths',     dims: strong,     labelColor: 'text-teal-400'   },
            { group: 'Developing',    dims: developing, labelColor: 'text-amber-400'  },
            { group: 'Priority Gaps', dims: critical,   labelColor: 'text-red-400'    },
          ].map(({ group, dims, labelColor }) => dims.length > 0 && (
            <div key={group} className="space-y-3">
              <p className={`text-xs font-mono uppercase tracking-widest ${labelColor}`}>{group}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dims.map(d => {
                  const median = INDUSTRY_MEDIANS[d.name] ?? 50;
                  const delta  = d.score - median;
                  return (
                    <div key={d.name} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-xl mt-0.5">{DIMENSION_ICONS[d.name] ?? '◆'}</span>
                          <span className="text-slate-200 text-sm font-medium leading-snug">{d.name}</span>
                        </div>
                        <span className="text-2xl font-bold text-white tabular-nums shrink-0">{d.score}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor(d.score)} rounded-full`}
                            style={{ width: `${d.score}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">Industry median: {median}</span>
                          <span className={delta >= 0 ? 'text-teal-400' : 'text-red-400'}>
                            {delta >= 0 ? '+' : ''}{delta} vs median
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Action Plan */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Action Plan</h2>
            {paid && <span className="text-xs bg-teal-900/40 text-teal-400 border border-teal-500/30 px-2.5 py-0.5 rounded-full">Unlocked</span>}
          </div>

          {report?.partial ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
              <p className="text-slate-400 text-sm">Complete the interview to unlock your action plan.</p>
            </div>

          ) : !paid ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-800/50">
                <p className="text-slate-400 text-sm leading-relaxed">
                  Your full action plan includes prioritised recommendations across all {report?.dimensions.length ?? 8} dimensions —
                  quick wins to start this week, structured 6-month programmes, and 12–24 month strategic initiatives
                  tailored to your specific gaps.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {([
                    { label: 'Quick Wins',    desc: '30-day actions',      color: 'text-teal-400'   },
                    { label: '6-Month Plan',  desc: 'Structured quarter',   color: 'text-amber-400'  },
                    { label: 'Strategic',     desc: '12\u201324 month vision', color: 'text-purple-400' },
                  ] as const).map(t => (
                    <div key={t.label} className="bg-slate-800/50 rounded-xl p-3">
                      <p className={`text-xs font-semibold ${t.color}`}>{t.label}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-8 py-8 text-center space-y-3">
                <p className="text-white font-semibold text-lg">Unlock your full action plan</p>
                <p className="text-slate-500 text-sm">One-time payment · Instant access · No subscription</p>
                <button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="mt-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
                >
                  {checkoutLoading ? 'Redirecting…' : 'Get Full Report — $49'}
                </button>
              </div>
            </div>

          ) : planLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />)}
            </div>

          ) : plan ? (
            <div className="space-y-5">
              {(Object.entries(TIER_META) as [keyof typeof TIER_META, (typeof TIER_META)[keyof typeof TIER_META]][])
                .map(([key, meta]) => {
                  const items = plan[key] ?? [];
                  if (!items.length) return null;
                  return (
                    <div key={key} className={`border ${meta.border} rounded-2xl overflow-hidden`}>
                      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <div>
                          <p className={`font-semibold text-sm ${meta.color}`}>{meta.label}</p>
                          <p className="text-slate-600 text-xs">{meta.desc}</p>
                        </div>
                        <span className="text-slate-600 text-xs">{items.length} actions</span>
                      </div>
                      <div className="divide-y divide-slate-800/50">
                        {items.map((item, i) => (
                          <div key={i} className="px-6 py-4 flex items-start gap-4">
                            <span className={`mt-0.5 text-xs font-mono ${meta.color} shrink-0`}>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-200 text-sm leading-snug">{item.action}</p>
                              <p className="text-slate-500 text-xs mt-1">{item.dimension}</p>
                            </div>
                            <div className="shrink-0 flex gap-2 text-xs">
                              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{item.impact}</span>
                              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{item.effort}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              {plan.summary && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">Consultant Note</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{plan.summary}</p>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <div className="flex justify-center">
          <a href={`/report/${id}/share`} className="text-slate-600 hover:text-slate-400 text-sm underline transition-colors">
            Share this report →
          </a>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 mt-16 px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-teal-500 font-bold text-sm">Connai</span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-600 text-xs">Digital Maturity Intelligence</span>
          </div>
          <p className="text-slate-700 text-xs">
            Built by{' '}
            <a href="https://linkgrow.io" className="text-slate-600 hover:text-slate-400 transition-colors">
              Linkgrow
            </a>
            {' '}· {reportDate}
          </p>
        </div>
      </footer>
    </div>
  );
}
