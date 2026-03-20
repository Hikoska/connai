-- Connai Sprint Run 24: Missing columns accumulated since sprint start
-- Generated: 2026-03-20 by SureThing Sprint
-- Run this in Supabase Dashboard -> SQL Editor (Project: mhuofnkbjbanrdvvktps)

-- =========================================================
-- interviews table
-- =========================================================

-- [RUN22] Status lifecycle timestamps
-- first_message_at: set when stakeholder sends their first reply
-- completed_at:     set when interview reaches 16 turns (isDone)
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS first_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at     TIMESTAMPTZ;

-- [RUN23] CRITICAL: Interview transcript storage
-- Without this column, interviews/message PATCH silently drops the transcript
-- and report/generate scores an empty string -> all dimensions default to 45
-- transcript is a JSONB array: [{"role":"user"|"assistant","content":"..."}]
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]'::jsonb;

-- Index for admin dashboard sorting by status+time
CREATE INDEX IF NOT EXISTS idx_interviews_status
  ON interviews (status, first_message_at DESC);

-- =========================================================
-- reports table
-- =========================================================

-- [RUN19] Action plan persistence (avoids re-generating on every visit)
-- Populated by /api/report/[id]/action-plan after first AI call
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS action_plan JSONB;

-- [RUN19] Maturity tier label derived from overall_score
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS exec_tier TEXT;

-- =========================================================
-- Verify
-- =========================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('interviews', 'reports')
ORDER BY table_name, ordinal_position;
