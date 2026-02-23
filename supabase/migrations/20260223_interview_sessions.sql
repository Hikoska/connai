-- MVP interview sessions table
-- Matches /api/interview route exactly (no FK dependencies for direct flow)
-- Created: 2026-02-23 | SureThing relay from QA Cycle 3 findings

CREATE TABLE IF NOT EXISTS interview_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  stakeholder_email TEXT  NOT NULL,
  organisation      TEXT  NOT NULL,
  country           TEXT  NOT NULL DEFAULT 'MU',
  industry          TEXT,
  status            TEXT  NOT NULL DEFAULT 'pending', -- pending | in_progress | completed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: service role only (no public access)
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

-- Index for token lookups (used in /interview/[token] page)
CREATE INDEX IF NOT EXISTS idx_interview_sessions_token
  ON interview_sessions (token);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_interview_sessions_updated_at ON interview_sessions;
CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
