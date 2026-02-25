# FORGE_CONTEXT — Connai Project Memory
**Last updated: 2026-02-25**
_Read this at the start of every sprint. SureThing updates it after each committed sprint._

---

## Stack
- **Framework**: Next.js 14.2.5, App Router only — never Pages Router
- **Deploy**: Vercel (auto on push to main OR staging preview on staging branch)
- **Database**: Supabase (REST API only in server routes — no `@supabase/supabase-js` createClient in API routes)
- **LLM**: Groq primary (`llama-3.3-70b-versatile`) → Cerebras fallback (`llama3.1-8b`)
- **Auth**: Supabase Auth (anon key for client-side, service role key for API routes)
- **Styling**: Tailwind CSS

---

## Branch Workflow (CRITICAL — read before any commit)

```
  Forge RELAY_COMMIT → staging branch → Vercel preview build
       if READY (green) → SureThing merges staging → main → production
       if ERROR  (red)  → SureThing reads logs, fixes, commits again to staging
```

**Forge always targets `staging` branch in RELAY_COMMIT — NEVER directly to `main`.**
SureThing owns the merge to main after build verification.

Why: Every direct-to-main commit triggers a Vercel production build. One broken commit = production down.

---

## Gate Rules (hard rejects — every RELAY_COMMIT)

1. **No `pages/` directory** (except `pages/api/` if truly needed)
2. **No banned packages**: `react-router-dom`, `@nuxtjs/*`, `prisma`
3. **⛔ No module-level `createClient()` in API routes** — THE #1 CAUSE OF BUILD FAILURES.
   Use `fetch()` to Supabase REST instead:
   ```ts
   // WRONG (breaks Vercel build — crashes during "collecting page data" phase):
   import { createClient } from '@supabase/supabase-js'
   const supabase = createClient(url, key)  // ← THIS LINE KILLS THE BUILD
   
   // CORRECT:
   const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/TABLE`, {
     headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${...}` }
   })
   ```
4. **`'use client'`** at top of every component using hooks (`useState`, `useEffect`, `useParams`, `useRouter`, etc.)
5. **Navigation**: `useParams`, `useRouter` from `next/navigation` — NOT `next/router`
6. **Page exports**: `export default function PageName()` — not named export
7. **Supabase import in client components**: Use lazy import or `@/lib/supabase/client` — not direct module-level `createClient`

---

## Database Tables

```
leads:       id (uuid), session_id, org_name, industry, role, email,
             status ('captured'|'interviewed'|'reported'), captured_at,
             stakeholders (jsonb), audit_token (uuid)

interviews:  id (uuid), lead_id (→ leads.id), stakeholder_name, stakeholder_role,
             stakeholder_email, status ('pending'|'in_progress'|'complete'),
             interview_token (uuid), answers (jsonb), completed_at

reports:     id (uuid), interview_id, lead_id (→ leads.id), dimensions (jsonb),
             pack_type, partial (boolean), created_at
```

---

## URL Conventions

| Route | Token meaning |
|-------|---------------|
| `/audit/[token]` | `leads.id` (UUID) |
| `/interview/[token]` | `interviews.interview_token` (UUID) |
| `/report/[id]` | `leads.id` (UUID) |
| `/dashboard` | Requires Supabase auth session |

---

## Key API Routes

```
POST  /api/chat                          Main conversation (capture + stakeholder collection)
POST  /api/invites/generate              Create interview rows per stakeholder
PATCH /api/interviews/email              Set stakeholder_email + status=in_progress
PATCH /api/interviews/complete           Set status=complete, completed_at, answers; update leads.status
GET   /api/report/[leadId]/preview       Aggregate dimension scores (0-100), update leads.status
```

All API routes use raw `fetch()` to Supabase REST — no createClient.

---

## Supabase REST Pattern (copy-paste template)

```ts
const res = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/TABLE_NAME?FILTER`,
  {
    method: 'PATCH', // or GET, POST, DELETE
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation', // omit for minimal
    },
    body: JSON.stringify({ field: value }),
  }
);
```

---

## Phase 2 Status (as of 2026-02-25)

| Task | Status | SHA |
|------|--------|-----|
| T7 (schema migrations) | ✅ | `ed8d1df` |
| T1 (dashboard fix) | ✅ | `1f0da94` |
| T2a (FloatingAIWidget tag) | ✅ | `c92e3f6` |
| T2b (chat Steps 5+6) | ✅ | `dc5f6e6` |
| T3a (invites/generate API) | ✅ | `337c7f0` |
| T3b (audit page) | ✅ | `7200b1d` |
| T4 (interview page) | ✅ | `2740361` |
| T5 (report preview API + page) | ✅ | `0f0e986` + `84a45a6` |
| T6 (audit → report wiring) | ✅ | `f7568d4` |
| Daily fix: createClient crash | ✅ | `32f7b8d` |
| Daily fix: audit page + scores + stub | ✅ | `8ebbc18` |
| FORGE_CONTEXT.md | ✅ | `6b47719` |
| Staging branch workflow | ✅ | this commit |
| T7-UX (Creative Sprint) | 🔄 In progress | — |
| Fix C (leads.status lifecycle) | ⏳ Queued | — |
| E2E test script | ⏳ Queued | — |

---

## Current Forge Assignment

T7-UX: Landing page Creative Sprint — UX improvements, navbar, hero visual, layout modernisation.
**Target branch: `staging`** (not main)

After T7: Fix C → E2E test script → performance pass

---

## Environment Variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL        Public Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   Public anon key (client-side reads)
SUPABASE_SERVICE_ROLE_KEY       Service role key (API routes only — never expose client-side)
GROQ_API_KEY                    Groq LLM API key
CEREBRAS_API_KEY                Cerebras fallback LLM
```
