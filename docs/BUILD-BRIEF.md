# Build Brief — Claw-1 Execution Plan
*Target: 7 days to end-to-end working MVP*

## Context

This is a SaaS product that runs AI-powered employee interviews for digital maturity assessment.
Read `docs/MVP-SPEC.md` for full product spec.

## Existing Scaffold

Claw-1 already set up: Next.js + Tailwind + shadcn/ui + Supabase + TypeScript.
Build on top of what exists — don't recreate.

## Day 1-2: Database + Auth + Company Setup

### Supabase Schema

```sql
-- Companies
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  size text, -- '1-10', '11-50', '51-200', '200+'
  logo_url text,
  admin_email text not null,
  created_at timestamptz default now()
);

-- Employees (interview subjects)
create table employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  name text not null,
  email text not null,
  role text,
  department text,
  interview_status text default 'pending', -- pending, invited, in_progress, completed
  invite_token uuid default gen_random_uuid(),
  created_at timestamptz default now()
);

-- Conversations (the actual interviews)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  company_id uuid references companies(id),
  started_at timestamptz,
  completed_at timestamptz,
  phase text default 'warmup', -- warmup, daily_life, challenges, deep_dive, ideal_world, wrapup
  messages jsonb default '[]'::jsonb,
  extracted_signals jsonb default '[]'::jsonb, -- dimension tags + opportunity tags
  created_at timestamptz default now()
);

-- Assessment Results (per company, after all interviews processed)
create table assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  dimension_scores jsonb, -- { "it_infrastructure": 3.2, "cybersecurity": 2.1, ... }
  opportunities jsonb, -- [{ title, pillar, difficulty, cost, impact, priority, evidence }]
  report_url text,
  status text default 'processing', -- processing, ready, delivered
  created_at timestamptz default now()
);
```

### Auth
- Admin: Supabase Auth (magic link or password)
- Employees: No auth — access via unique invite_token URL

### Pages
- `/` — Landing page
- `/login` — Admin login
- `/dashboard` — Admin dashboard (company setup, employee list, progress)
- `/interview/[token]` — Employee interview chat UI (no auth needed)
- `/report/[id]` — Report viewer

## Day 3-4: AI Interview Engine

### System Prompt Architecture

The AI interviewer needs a system prompt that:
1. Knows the 8 assessment dimensions
2. Follows the 6-phase interview flow
3. Adapts based on employee role/department
4. Tags findings to dimensions AND opportunities in real-time
5. Tracks conversation phase and transitions naturally

### API: Gemini 2.5 Pro
- Use `@google/generative-ai` npm package
- Free tier: 50 requests/day (sufficient for dev)
- Structured output for signal extraction

### Chat UI
- Clean, full-screen chat interface
- Typing indicator
- Phase progress bar (subtle, top of screen)
- Mobile-responsive (employees might use phone)

## Day 5-6: Report Generation

### Analysis Pipeline
1. Collect all conversations for a company
2. Cross-reference signals across interviews
3. Score each dimension (weighted average of evidence)
4. Rank opportunities by priority formula
5. Generate report data structure

### PDF Generation
- Use React-PDF for slide-deck style output
- 16:9 landscape format
- Spider chart (8 dimensions) — use a simple SVG
- Opportunity grid tables
- Priority matrix visual

## Day 7: Integration + Polish

- End-to-end test: create company → add employees → complete interviews → generate report
- Email invitations via Resend
- Basic landing page
- Deploy to Vercel

## Critical Constraints

1. **Gemini first** — use Gemini 2.5 Pro free tier for all AI. Claude/GPT swap later.
2. **No scope creep** — MVP is: interview → report. No payments, no multi-tenant billing yet.
3. **Mobile-first chat** — employees will interview on their phones.
4. **Privacy** — interview responses must be anonymized in reports.
