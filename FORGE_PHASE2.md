# Connai Phase 2 — Multi-Stakeholder Pipeline
**Dispatched:** 2026-02-24 · **Priority order: execute top to bottom autonomously**

Repo: `Hikoska/connai` · Branch: `main` · Deploy: Vercel auto on push

---

## CONTEXT

The current app supports a single-stakeholder flow: landing → modal → one interview → report API (no UI). The target flow is:

Owner visits → chat creates their account → Connai gathers data → asks about org structure to determine who else gets interviewed → those stakeholders get interview links → each completes their interview → report preview updates progressively → final report generated and displayed.

**Pre-commit rules (mandatory — gate will reject)**:
- App Router only — no files under `pages/` except `pages/api/`
- No `@nuxtjs/*` packages
- Supabase client: `import { createClient } from '@/lib/supabase/client'`
- No `react-router-dom`

---

## EXECUTION ORDER

```
Task 7 (schema) → Task 1 (dashboard fix) → Tasks 2+3 in parallel → Task 4 → Task 5 → Task 6
```

---

## TASK 7 — Supabase schema (DO THIS FIRST)

Run via Supabase REST API using `SUPABASE_SERVICE_ROLE_KEY`:

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stakeholders jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS audit_token uuid DEFAULT gen_random_uuid();
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS stakeholder_name text;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS stakeholder_role text;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_token uuid DEFAULT gen_random_uuid();
ALTER TABLE reports ADD COLUMN IF NOT EXISTS partial boolean DEFAULT false;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id);
```

File: `supabase/migrations/[timestamp]_phase2_schema.sql`. Verify columns exist before next tasks.

RELAY_COMMIT: `feat: supabase schema — phase2 columns`

---

## TASK 1 — Fix `/dashboard`

**File**: `src/app/dashboard/page.tsx`

Problem: queries `audit_sessions` which doesn't exist. Real tables: `leads` + `interviews`.

Fix:
- Replace `audit_sessions` query with `leads` where `email = current user email`
- Fetch associated `interviews` rows per lead (join on `lead_id` or `session_id`)
- Show: org name, email, interview status, date, "View Report" link if `reports` row exists
- If not authed and no session_id in URL: show email lookup form ("Enter your email to view your audit status")
- Keep existing logout handler

Schema: `leads(id, session_id, org_name, industry, role, email, status, captured_at)` · `interviews(id, stakeholder_email, organisation, status, created_at, completed_at)` · `reports(id, interview_id, dimensions, pack_type, created_at)`

RELAY_COMMIT: `fix: dashboard — query leads+interviews tables, session-based lookup`

---

## TASK 2 — Org structure mapping (extend chat)

**Files**: `src/app/api/chat/route.ts`, new `src/lib/parseStakeholders.ts`

After chat captures email, Connai asks:
> "Great — one more thing. To give [org name] a complete picture, we typically gather input from 2–3 other people in your team. Who are the key people involved in your digital operations? For example: IT lead, operations manager, finance director. Just list their names and roles."

- Parse response → `[{ name: string, role: string }]` via `parseStakeholders.ts` (regex or small LLM call)
- Upsert into `leads.stakeholders` (jsonb)
- Connai replies: "Perfect. I've noted [N] stakeholders. Interview links are on your audit page — each takes about 15 minutes."
- Internally call `POST /api/invites/generate` to create interview records
- End chat by directing owner to `/audit/[lead_id]`

RELAY_COMMIT: `feat: org structure mapping — post-email stakeholder collection in chat`

---

## TASK 3 — Invite generation API + audit account page

**Files**: new `src/app/api/invites/generate/route.ts`, new `src/app/audit/[token]/page.tsx`

**API** `POST /api/invites/generate`:
- Input: `{ lead_id: string, stakeholders: [{ name, role }] }`
- For each stakeholder, insert into `interviews`: `{ lead_id, stakeholder_name, stakeholder_role, stakeholder_email: null, status: 'pending', interview_token: uuid() }`
- Return: `[{ name, role, interview_url: '/interview/[token]' }]`

**Audit page** `/audit/[token]` (no auth — token = `leads.id`):
- Fetch lead + all interviews by `lead_id`
- Show: org name, status badge ("In progress — 2/4 interviews complete")
- Table: Name | Role | Status | Interview Link (Copy button per row)
- Report Preview section (wired in Task 6)

RELAY_COMMIT: `feat: invite generation API + /audit/[token] account page`

---

## TASK 4 — Interview page: stakeholder context + completion

**Files**: `src/app/interview/[id]/page.tsx`

- On load: fetch `interviews` row by id param
- If `status = 'pending'`: show "You've been invited to contribute to [org name]'s digital readiness audit. This takes about 15 minutes."
- First Connai message: "Welcome! Before we begin, could you confirm your name and email address?"
- On email capture: upsert `stakeholder_email` into interviews row
- Use existing `/api/chat` logic for the interview
- On completion: set `status = 'complete'`, `completed_at = now()`, then POST to `/api/report/preview?lead_id=...`

RELAY_COMMIT: `feat: interview page — org context, stakeholder email capture, completion trigger`

---

## TASK 5 — Progressive report preview + report display page

**Files**: new `src/app/api/report/preview/route.ts`, `src/app/report/[id]/page.tsx`

**API** `GET /api/report/preview?lead_id=[id]`:
- Fetch all `interviews` where `lead_id` and `status = 'complete'`
- If 0: return `{ ready: false }`
- If ≥1: aggregate dimension scores (average), upsert into `reports` with `partial: (N < M)`
- Return: `{ ready: true, dimensions: {...}, complete_count: N, total_count: M, partial: bool }`

**Report display page** (replace Phase 2 stub):
- Fetch report from `reports` by `interview_id` or `lead_id`
- Show: "[Org name] — Digital Readiness Report" + date
- If partial: yellow banner "Preview based on [N] of [M] interviews. Updates as more complete."
- 5 dimension score cards (0–10, color: <4 red · 4–7 amber · 7+ green)
  - Infrastructure · Security · Processes · People · Customer Experience
- 1-sentence interpretation per dimension (LLM or static rules)
- CTA: "Book a consultation" → `mailto:lmamet@linkgrow.io`

RELAY_COMMIT: `feat: progressive report preview API + /report/[id] display page`

---

## TASK 6 — Wire audit page to report preview

**File**: `src/app/audit/[token]/page.tsx`

In Report Preview section, fetch `/api/report/preview?lead_id=[token]`:
- `ready: false` → "Waiting for first interview to complete"
- `ready: true, partial: true` → mini score cards + link to `/report/[interview_id]`
- `ready: true, partial: false` → "Final report ready" badge + prominent link

RELAY_COMMIT: `feat: audit page — live report preview section`

---

## KNOWN FIXES (ship alongside sprint)

**Fix A** — `/api/interview/start` and `/api/interview/message` are unused stubs (live app uses `/api/chat`). Delete them or add `return NextResponse.redirect('/api/chat')`.

**Fix B** — `/dashboard` null-user branch: add `window.location.href = '/auth/login'` so it actually redirects.

**Fix C** — `leads.status` is never updated after creation. Update to `'interviewed'` when interview completes, `'reported'` when report generates.

---

## DONE SIGNAL

When all tasks committed, post to `#forge-reports`:
```
FORGE PHASE 2 COMPLETE
Tasks: 7 features + 3 fixes
Commits: [hashes]
Live: https://connai.linkgrow.io
/audit/[lead_id] ✅  /report/[id] ✅
```
