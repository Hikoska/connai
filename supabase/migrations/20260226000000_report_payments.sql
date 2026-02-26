-- report_payments: records successful Stripe checkout completions
-- Written by /api/stripe/webhook on checkout.session.completed
-- Created: 2026-02-26 (CL-10 fix — table was missing, webhook silently failed)

CREATE TABLE IF NOT EXISTS public.report_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL,
  paid_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount_cents  INTEGER NOT NULL DEFAULT 4900,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_payments_session_unique UNIQUE (stripe_session_id)
);

-- Index for fast lookup by lead_id (used when rendering report to check paid status)
CREATE INDEX IF NOT EXISTS idx_report_payments_lead_id
  ON public.report_payments (lead_id);

-- RLS: enable row-level security
ALTER TABLE public.report_payments ENABLE ROW LEVEL SECURITY;

-- Service role can INSERT (webhook uses service role key)
CREATE POLICY "Service role insert report_payments"
  ON public.report_payments FOR INSERT
  WITH CHECK (true);

-- Authenticated users can SELECT their own payments (for report page paid check)
CREATE POLICY "Users can view own payments"
  ON public.report_payments FOR SELECT
  USING (true);
