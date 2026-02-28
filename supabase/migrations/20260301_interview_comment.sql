-- CL-36: Add stakeholder_comment column to interviews table
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS stakeholder_comment TEXT;
