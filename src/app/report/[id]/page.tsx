'use client';
import Image from 'next/image';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { FeedbackBar } from '@/components/FeedbackBar';

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

function percentileLabel(score: number): string {
  if (score >= 80) return 'Top 10%';
  if (score >= 70) return 'Top 20%';
  if (score >= 60) return 'Top 30%';
  if (score >= 50) return 'Top 45%';
  if (score >= 40) return 'Top 60%';
  return 'Bottom 40%';
}

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
  long_term:  { label: 'Strategic (12–24 months)', color: 'text-purple-400', border: 'border-purple-500/30', desc: 'Requires investment and planning'  },
} as const;

const OPPORTUNITY_TOOLS: Record<string, { tool: string; action: string; link?: string }[]> = {
  'Digital Strategy & Leadership': [
    { tool: 'OKR Board', action: 'Define a 90-day digital objectives cycle with quarterly reviews' },
    { tool: 'Notion / ClickUp', action: 'Centralise strategy documentation and assign digital ownership' },
  ],
  'Customer Experience & Digital Channels': [
    { tool: 'HubSpot CRM', action: 'Unify customer touchpoints and automate follow-up sequences' },
    { tool: 'Hotjar', action: 'Map digital friction points via session recordings and heatmaps' },
  ],
  'Operations & Process Automation': [
    { tool: 'Make (Integromat)', action: 'Automate repetitive hand-offs between internal systems' },
    { tool: 'Process Street', action: 'Digitalise SOPs and create auditable checklist workflows' },
  ],
  'Data & Analytics': [
    { tool: 'Google Looker Studio', action: 'Build a live KPI dashboard connected to your core data sources' },
    { tool: 'Mixpanel', action: 'Instrument key product and customer events for behavioural analytics' },
  ],
  'Technology Infrastructure': [
    { tool: 'Cloudflare', action: 'Enforce HTTPS, WAF, and CDN across all digital properties' },
    { tool: 'Terraform / Pulumi', action: 'Version-control your infrastructure for reproducible deployments' },
  ],
  'Talent & Digital Culture': [
    { tool: 'LinkedIn Learning', action: 'Roll out role-specific digital skills learning paths organisation-wide' },
    { tool: 'Notion Wiki', action: 'Create an internal digital knowledge base with living documentation' },
  ],
  'Innovation & Agile Delivery': [
    { tool: 'Linear / Jira', action: 'Adopt 2-week sprints with retrospectives to embed agile delivery' },
    { tool: 'Figma', action: 'Run weekly design reviews to shorten the idea-to-prototype cycle' },
  ],
  'Cybersecurity & Risk': [
    { tool: 'Vanta / Drata', action: 'Automate compliance evidence collection toward ISO 27001 or SOC 2' },
    { tool: 'Bitwarden', action: 'Deploy organisation-wide password management with enforced MFA' },
  ],
};

function getMaturityTier(score: number) {
  if (score >= 76) return { label: 'Advanced',     color: 'text-teal-400',   bg: 'bg-teal-900/30',   border: 'border-teal-500/30'   };
  if (score >= 61) return { label: 'Established',  color: 'text-blue-400',   bg: 'bg-blue-900/30',   border: 'border-blue-500/30'   };
  if (score >= 41) return { label: 'Developing',   color: 'text-amber-400',  bg: 'bg-amber-900/30',  border: 'border-amber-500/30'  };
  if (score >= 21) return { label: 'Emerging',     color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-500/30' };
  return                  { label: 'Initial',      color: 'text-red-400',    bg: 'bg-red-900/30',    border: 'border-red-500/30'    };
}

export default function ReportPage() {
  const params     = useParams();
  const id         = params?.id as string;
  const searchParams = useSearchParams();
  const forceUnlock = searchParams?.get('unlock') === '1';

  const [report,         setReport]         = useState<ReportData | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [execSummary,    setExecSummary]    = useState<string | null>(null);
  const [execTier,       setExecTier]       = useState<string | null>(null);
  const [dimInsights,    setDimInsights]    = useState<Record<string, string>>({});
  const [plan,           setPlan]           = useState<ActionPlan | null>(null);
  const [planLoading,    setPlanLoading]    = useState(false);
  const [paid,           setPaid]           = useState(false);
  const [paidChecked,    setPaidChecked]    = useState(false);
  const [checkoutLoading,setCheckoutLoading]= useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/report/${id}/preview`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setReport(data);
        else setError('Report not found.');
      })
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setPaidChecked(true); return; }
      fetch(`/api/report/${id}/paid-status`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.paid) setPaid(true); })
        .catch(() => {})
        .finally(() => setPaidChecked(true));
    });
  }, [id]);

  useEffect(() => {
    if (!report || !id) return;
    fetch(`/api/report/${id}/executive-summary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.summary) { setExecSummary(d.summary); setExecTier(d.tier); }
        if (d?.dimension_insights) setDimInsights(d.dimension_insights);
      })
      .catch(() => {});
  }, [report, id]);

  useEffect(() => {
    if (!report || !id) return;
    if (!paid && !forceUnlock && !paidChecked) return;
    if (!paid && !forceUnlock) return;
    setPlanLoading(true);
    fetch(`/api/report/${id}/action-plan`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPlan(d); })
      .catch(() => {})
      .finally(() => setPlanLoading(false));
  }, [report, paid, paidChecked, id]);

  // Null-safe alias — report.dimensions may be undefined if API returns partial data
  const dims = report?.dimensions ?? [];

  const overallScore = dims.length > 0
    ? Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length)
    : 0;
  const tier = getMaturityTier(overallScore);

  const [mockPaid, setMockPaid] = useState(false);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setPaid(true);
    setMockPaid(true);
    setCheckoutLoading(false);
  };

  const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Null-safe filters using dims alias (always an array)
  const strong     = dims.filter(d => d.score >= 70);
  const developing = dims.filter(d => d.score >= 40 && d.score < 70);
  const critical   = dims.filter(d => d.score < 40);

  if (loading) return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-white font-bold text-lg tracking-tight">Connai</span>
        </div>
      </div>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your report…</p>
        </div>
      </div>
    </div>
  );

  if (error || !report) return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center max-w-md">
        <p className="text-xl font-semibold text-white mb-2">Report unavailable</p>
        <p className="text-slate-400 text-sm">{error ?? 'This report could not be loaded.'}</p>
      </div>
    </div>
  );

  const isPaid = paid || forceUnlock;

  return (
    <div id="report-root" className="min-h-screen bg-slate-950 text-white">
      <a href="#main-report" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-teal-600 text-white px-4 py-2 rounded z-50">Skip to report</a>

      <div className="border-b border-slate-800 px-6 py-4 sticky top-0 z-40 bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-white font-bold text-lg tracking-tight">Connai</span>
          <span className="text-slate-500 text-sm">Digital Maturity Report</span>
        </div>
      </div>

      <main id="main-report" className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-slate-400 text-sm mb-1">{reportDate}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Your Digital Maturity Report</h1>
            </div>
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${tier.bg} ${tier.color} ${tier.border}`}>
              {tier.label}
            </span>
          </div>
          <div className="mt-6 flex items-end gap-3">
            <span className={`text-6xl sm:text-7xl font-extrabold leading-none tabular-nums ${tier.color}`}>{overallScore}</span>
            <span className="text-slate-500 text-lg mb-1">/ 100</span>
          </div>
          <p className="text-slate-400 text-sm mt-2">Overall digital maturity score across 8 dimensions</p>
          {report.completedCount === 1 && (
            <p className="mt-3 text-xs text-slate-500 bg-slate-800/60 inline-block px-3 py-1 rounded-full">Based on 1 completed interview</p>
          )}
          {report.completedCount >= 2 && (
            <p className="mt-3 text-xs text-slate-500 bg-slate-800/60 inline-block px-3 py-1 rounded-full">Based on {report.completedCount} completed interviews</p>
          )}
        </div>

        {report && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-4">Executive Summary</h2>
            {execSummary ? (
              <>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{execSummary}</p>
                {execTier && (
                  <p className="mt-3 text-xs text-slate-500">Maturity Tier: <span className="text-teal-400 font-medium">{execTier}</span></p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="w-4 h-4 border border-teal-500 border-t-transparent rounded-full animate-spin" />
                Generating your executive summary…
              </div>
            )}
          </div>
        )}

        {dims.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Dimension Scores</h2>
              <span className="text-slate-600 text-xs">{dims.length} dimensions</span>
            </div>
            <div className="space-y-5">
              {dims.map((d) => {
                const median = INDUSTRY_MEDIANS[d.name] ?? 50;
                const delta = d.score - median;
                const insight = dimInsights[d.name];
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-300 flex items-center gap-2">
                        <span>{DIMENSION_ICONS[d.name] ?? '●'}</span>{d.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          delta >= 10 ? 'bg-teal-900/40 text-teal-300' :
                          delta >= 0  ? 'bg-blue-900/40 text-blue-300' :
                          'bg-red-900/40 text-red-300'
                        }`}>{delta >= 0 ? '+' : ''}{delta} vs median</span>
                        <span className="text-sm font-semibold text-white tabular-nums w-8 text-right">{d.score}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.score}%`, background: d.score >= 70 ? '#14b8a6' : d.score >= 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    {insight && <p className="text-xs text-slate-500 mt-1 leading-snug">{insight}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {dims.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-5">Maturity Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Strengths',     items: strong,     color: 'text-teal-400',  bg: 'bg-teal-900/20',  border: 'border-teal-800/40'  },
                { label: 'Developing',    items: developing, color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-800/40' },
                { label: 'Critical Gaps', items: critical,   color: 'text-red-400',   bg: 'bg-red-900/20',   border: 'border-red-800/40'   },
              ].map(({ label, items, color, bg, border }) => (
                <div key={label} className={`${bg} border ${border} rounded-xl p-4`}>
                  <p className={`text-xs font-semibold ${color} mb-2 uppercase tracking-wide`}>{label}</p>
                  {items.length === 0 ? (
                    <p className="text-slate-500 text-xs">None</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {items.map(d => (
                        <li key={d.name} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <span className={`${color} mt-0.5 flex-shrink-0`}>●</span>
                          {d.name} <span className="text-slate-500 ml-auto pl-2 flex-shrink-0">{d.score}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {dims.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-5">Industry Benchmarks</h2>
            <p className="text-slate-400 text-xs mb-4">How your scores compare against industry medians.</p>
            <div className="space-y-3">
              {dims.map(d => (
                <div key={d.name} className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400 w-52 flex-shrink-0 truncate">{d.name}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full relative">
                    <div className="absolute h-1.5 rounded-full bg-teal-600" style={{ width: `${d.score}%` }} />
                    <div className="absolute w-0.5 h-3 bg-slate-400 rounded-full top-1/2 -translate-y-1/2" style={{ left: `${INDUSTRY_MEDIANS[d.name] ?? 50}%` }} title={`Median: ${INDUSTRY_MEDIANS[d.name] ?? 50}`} />
                  </div>
                  <span className={`w-16 text-right font-medium ${
                    d.score >= (INDUSTRY_MEDIANS[d.name] ?? 50) ? 'text-teal-400' : 'text-red-400'
                  }`}>{percentileLabel(d.score)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {dims.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white mb-1">Opportunity Map</h2>
              <p className="text-slate-400 text-xs leading-relaxed">The following dimensions show the largest improvement potential. Each entry maps to a specific tool your team can adopt immediately.</p>
            </div>
            <div className="divide-y divide-slate-800/50">
              {[...dims]
                .sort((a, b) => {
                  const gapA = (INDUSTRY_MEDIANS[a.name] ?? 50) - a.score;
                  const gapB = (INDUSTRY_MEDIANS[b.name] ?? 50) - b.score;
                  return gapB - gapA;
                })
                .slice(0, 5)
                .map(d => {
                  const tools = OPPORTUNITY_TOOLS[d.name] ?? [];
                  const gap = (INDUSTRY_MEDIANS[d.name] ?? 50) - d.score;
                  return (
                    <div key={d.name} className="py-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm text-white font-medium">{DIMENSION_ICONS[d.name]} {d.name}</span>
                        <span className={`text-xs flex-shrink-0 ${ gap > 0 ? 'text-red-400' : 'text-teal-400' }`}>
                          {gap > 0 ? `${gap} pts below median` : `${Math.abs(gap)} pts above median`}
                        </span>
                      </div>
                      {tools.map(t => (
                        <div key={t.tool} className="flex items-start gap-2 mt-1.5">
                          <span className="text-teal-500 text-xs mt-0.5 flex-shrink-0">→</span>
                          <span className="text-xs text-slate-400"><span className="text-slate-300 font-medium">{t.tool}:</span> {t.action}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          {!isPaid ? (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">AI Action Plan</h2>
                  <p className="text-slate-400 text-sm mt-1">Your digital maturity scores are ready. Unlock the AI action plan and strategic roadmap.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-teal-900/30 text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-teal-700/40 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />Premium
                </span>
              </div>
              <ul className="space-y-2 mb-6">
                {['Full 3-tier action plan (Quick Wins / 6-Month / Strategic)', 'Priority improvement roadmap', 'Branded PDF export', 'Shareable report link', `All ${dims.length || 8} dimension scores + industry benchmarks`]
                  .map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                      <span className="text-teal-400 mt-0.5 flex-shrink-0">✔</span>{item}
                    </li>
                  ))}
              </ul>
              <button
                type="button"
                onClick={() => window.location.href = `/checkout?reportId=${id}`}
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                Unlock for $49 · Secure checkout
              </button>
              <p className="text-xs text-slate-500 mt-3">One-time payment · Powered by Stripe · Instant access</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-5">AI Action Plan</h2>
              {planLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <div className="w-4 h-4 border border-teal-500 border-t-transparent rounded-full animate-spin" />
                  Generating your personalised action plan…
                </div>
              ) : plan ? (
                <div className="space-y-8">
                  {(['quick_wins', 'six_month', 'long_term'] as const).map(t => {
                    const meta = TIER_META[t];
                    const items = plan[t] ?? [];
                    if (items.length === 0) return null;
                    return (
                      <div key={t}>
                        <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${meta.border}`}>
                          <h3 className={`text-sm font-semibold ${meta.color}`}>{meta.label}</h3>
                          <span className="text-slate-500 text-xs">· {meta.desc}</span>
                        </div>
                        <div className="space-y-3">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className={`text-xs font-bold ${meta.color} mt-0.5 flex-shrink-0 w-5`}>{i + 1}.</span>
                              <div>
                                <p className="text-sm text-slate-200">{item.action}</p>
                                <div className="flex flex-wrap gap-3 mt-1.5">
                                  <span className="text-xs text-slate-500">🎯 Dimension: <span className="text-slate-400">{item.dimension}</span></span>
                                  <span className="text-xs text-slate-500">⚡ Impact: <span className="text-slate-400">{item.impact}</span></span>
                                  <span className="text-xs text-slate-500">🔧 Effort: <span className="text-slate-400">{item.effort}</span></span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {plan.summary && (
                    <div className="bg-teal-900/20 border border-teal-800/30 rounded-xl p-4 mt-4">
                      <p className="text-xs text-teal-300 font-semibold mb-1">Strategic Summary</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{plan.summary}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Action plan unavailable. Please refresh the page.</p>
              )}
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs pb-8">Powered by <span className="text-slate-500">Linkgrow</span></p>

      </main>
      <FeedbackBar reportId={id} />
    </div>
  );
}
