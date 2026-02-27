-- Create report_feedback table
CREATE TABLE IF NOT EXISTS report_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id),
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
