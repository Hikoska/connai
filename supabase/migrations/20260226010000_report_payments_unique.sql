-- Migration: CL-13 — add UNIQUE constraint on report_payments.stripe_session_id
-- Prevents duplicate rows on Stripe webhook retries.
-- Safe to run even if report_payments table is empty.

ALTER TABLE report_payments
  ADD CONSTRAINT report_payments_stripe_session_id_key
  UNIQUE (stripe_session_id);
