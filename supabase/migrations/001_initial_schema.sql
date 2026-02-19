-- Linkgrow Lense — Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organisations (clients)
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free', -- free | starter | team | department | company | enterprise
  pack_credits_remaining INTEGER NOT NULL DEFAULT 1,
  subscription_plan TEXT, -- pulse | monitor | intelligence | null
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audits
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Digital Maturity Audit',
  department TEXT,
  status TEXT NOT NULL DEFAULT 'setup', -- setup | in_progress | analysing | complete
  context TEXT, -- C-suite briefing text
  interview_count_planned INTEGER NOT NULL DEFAULT 1,
  interview_count_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  subject_email TEXT NOT NULL,
  subject_name TEXT,
  subject_role TEXT,
  subject_department TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | in_progress | completed | cancelled
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcripts (interview messages)
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- ai | user
  content TEXT NOT NULL,
  sequence_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free', -- free | paid
  content JSONB, -- structured report data
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  pack_type TEXT, -- starter | team | department | company | subscription_pulse | subscription_monitor | subscription_intelligence
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed | refunded
  credits_added INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_email TEXT NOT NULL,
  referred_org_id UUID REFERENCES organisations(id),
  payment_id UUID REFERENCES payments(id),
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 13.00,
  commission_amount_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | earned | paid
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own org" ON organisations
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can view their org audits" ON audits
  FOR ALL USING (org_id IN (SELECT id FROM organisations WHERE owner_id = auth.uid()));

CREATE POLICY "Users can view their org interviews" ON interviews
  FOR ALL USING (org_id IN (SELECT id FROM organisations WHERE owner_id = auth.uid()));

CREATE POLICY "Public interview access via token" ON interviews
  FOR SELECT USING (true); -- Token-gated at application layer

CREATE POLICY "Users can view their org transcripts" ON transcripts
  FOR ALL USING (
    interview_id IN (
      SELECT i.id FROM interviews i
      JOIN organisations o ON i.org_id = o.id
      WHERE o.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their org reports" ON reports
  FOR ALL USING (org_id IN (SELECT id FROM organisations WHERE owner_id = auth.uid()));

-- Indexes
CREATE INDEX idx_interviews_token ON interviews(token);
CREATE INDEX idx_interviews_audit ON interviews(audit_id);
CREATE INDEX idx_transcripts_interview ON transcripts(interview_id, sequence_num);
CREATE INDEX idx_reports_audit ON reports(audit_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organisations_updated_at BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER audits_updated_at BEFORE UPDATE ON audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
