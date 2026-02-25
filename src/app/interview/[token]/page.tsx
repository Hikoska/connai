'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const QUESTIONS = [
  'How would you describe your organisation\'s current use of digital tools day-to-day?',
  'Which business process do you think is most overdue for a digital upgrade?',
  'Where do you feel the biggest friction or bottleneck in your current workflows?',
  'How confident are you that your team could adopt a new digital tool within 30 days?',
  'If you could change one thing about how your organisation uses technology, what would it be?',
];

export const dynamic = 'force-dynamic';

export default function InterviewPage() {
  const { token } = useParams<{ token: string }>();

  const [interview, setInterview] = useState<{
    lead_id: string;
    stakeholder_name: string;
    stakeholder_role: string;
  } | null>(null);
  const [lead, setLead] = useState<{ org_name: string; industry: string } | null>(null);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'questions' | 'done'>('email');
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(''));
  const [currentQ, setCurrentQ] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadContext() {
      // createClient inside effect — never at module level (gate rule #2)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: ivData, error: ivErr } = await supabase
        .from('interviews')
        .select('lead_id, stakeholder_name, stakeholder_role')
        .eq('token', token)
        .single();

      if (ivErr || !ivData) { setError('Invalid or expired interview link.'); setLoading(false); return; }
      setInterview(ivData);

      const { data: leadData, error: leadErr } = await supabase
        .from('leads')
        .select('org_name, industry')
        .eq('id', ivData.lead_id)
        .single();

      if (!leadErr && leadData) setLead(leadData);
      setLoading(false);
    }
    loadContext();
  }, [token]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    await fetch('/api/interviews/email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    });
    setSubmitting(false);
    setStep('questions');
  }

  async function handleAnswerNext() {
    if (!answers[currentQ].trim()) return;
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      setSubmitting(true);
      await fetch('/api/interviews/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, answers }),
      });
      setSubmitting(false);
      setStep('done');
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500 text-sm">Loading…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Digital Maturity Interview
          </div>
          {lead && (
            <p className="text-gray-600 text-sm leading-relaxed">
              You&#39;ve been invited by <span className="font-semibold text-gray-800">{lead.org_name}</span> to share your perspective on their digital maturity.
              {interview?.stakeholder_role && (
                <> As <span className="font-medium">{interview.stakeholder_role}</span>, your input shapes their roadmap.</>
              )}
            </p>
          )}
          {interview?.stakeholder_name && (
            <p className="mt-1 text-xs text-gray-400">Hi, {interview.stakeholder_name}</p>
          )}
        </div>

        {/* Step: email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-gray-400 mt-1">Used only to send you a copy of the findings.</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0D5C63] hover:bg-[#0a4a50] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Start Interview →'}
            </button>
          </form>
        )}

        {/* Step: questions */}
        {step === 'questions' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Question {currentQ + 1} of {QUESTIONS.length}</span>
              <div className="flex gap-1">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className={`h-1.5 w-6 rounded-full ${i <= currentQ ? 'bg-teal-500' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
            <p className="text-gray-800 font-medium text-sm leading-relaxed">{QUESTIONS[currentQ]}</p>
            <textarea
              rows={4}
              value={answers[currentQ]}
              onChange={(e) => {
                const updated = [...answers];
                updated[currentQ] = e.target.value;
                setAnswers(updated);
              }}
              placeholder="Your answer…"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={handleAnswerNext}
              disabled={submitting || !answers[currentQ].trim()}
              className="w-full bg-[#0D5C63] hover:bg-[#0a4a50] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving…' : currentQ < QUESTIONS.length - 1 ? 'Next →' : 'Submit Interview →'}
            </button>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="text-center space-y-3 py-4">
            <div className="text-4xl">✅</div>
            <p className="text-gray-800 font-semibold">Thank you for your input!</p>
            <p className="text-gray-500 text-sm">Your responses have been recorded. {lead?.org_name} will use them to build their digital maturity report.</p>
          </div>
        )}
      </div>
    </div>
  );
}
