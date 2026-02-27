-- CL-28: report_runs — one row per /api/report/generate invocation
-- Lets Ludovic audit every generation attempt (who, when, duration, tokens, status).

CREATE TABLE IF NOT EXISTS report_runs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  triggered_by      TEXT        NOT NULL DEFAULT 'manual',  -- 'auto' (isDone hook) | 'manual' (/report page)
  status            TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  duration_ms       INTEGER,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  error_msg         TEXT
);

CREATE INDEX IF NOT EXISTS idx_report_runs_lead_id
  ON report_runs (lead_id, started_at DESC);

ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;

-- Service role full access; anon/authenticated: no access
CREATE POLICY "Service role full access on report_runs"
  ON report_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
