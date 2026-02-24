-- Phase 2: Multi-stakeholder pipeline schema migration
-- Generated: 2026-02-24

-- Add stakeholders column to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS stakeholders JSONB DEFAULT '[]'::jsonb;

-- Add stakeholder context columns to interviews table
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS lead_id TEXT,
  ADD COLUMN IF NOT EXISTS stakeholder_name TEXT,
  ADD COLUMN IF NOT EXISTS stakeholder_role TEXT,
  ADD COLUMN IF NOT EXISTS interview_token TEXT UNIQUE;

-- Add partial flag and lead reference to reports table
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS partial BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_id TEXT;

-- Indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_interviews_lead_id ON interviews(lead_id);
CREATE INDEX IF NOT EXISTS idx_reports_lead_id ON reports(lead_id);
