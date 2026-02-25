# Forge Context — Connai Sprint

> This file is the source of truth for Forge. Read it before every commit.

## Architecture

- **Next.js 14 App Router** — `src/app/` only. Never create `pages/` directories.
- **Supabase** — raw `fetch()` to REST API in all `/api/` routes. Never use `createClient` in API routes.
- **Client components** — `'use client'` on ALL files using hooks or browser APIs.
- **Navigation** — `import { useRouter } from 'next/navigation'` (never `next/router`).
- **Pages** — `export default function PageName()` (never anonymous `export default`).
- **Auth** — Supabase Auth with OAuth. `supabase.auth.signInWithOAuth()` in client components only.

## Branch Rules

- Forge relay commits → `staging` branch ONLY. NEVER directly to `main`.
- SureThing owns `main` — it merges `staging` after verifying Vercel preview build is READY.
- RELAY_COMMIT means: commit your changes to `staging` and post `RELAY_COMMIT: [commit sha]` in #surething-to-forge.

## Gate Rules (will break build if violated)

1. **No `createClient` in API routes** — use raw fetch:
   ```ts
   const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tablename?...`, {
     headers: {
       apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
       Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
     }
   })
   ```

2. **No module-level `createClient` in ANY page** — static routes (`/auth/login`, `/auth/callback`, etc.) are pre-rendered at build time. If `createClient` runs at module level, it crashes during server-side pre-render:
   ```
   TypeError: createClient is not a function  ← build-time SSR crash
   ```
   **Correct pattern — always initialize inside the handler or useEffect:**
   ```tsx
   // ❌ WRONG — module level, crashes at build time
   const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)

   // ✅ CORRECT — inside handler or useEffect (browser-only)
   const signIn = async () => {
     const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)
     // ...
   }
   ```
   Or add `export const dynamic = 'force-dynamic'` to opt out of static generation.
   Dynamic routes (`/report/[id]`) are exempt — they’re never statically pre-rendered.

3. `'use client'` on any component using `useState`, `useEffect`, `useParams`, `useRouter`, etc.
4. `import { useRouter } from 'next/navigation'` — not `next/router`.
5. Page files must export `default function` with a real name.
6. No `pages/` directories.

## Current Production State

| Commit | Feature | Status |
|--------|---------|--------|
| dbe410c | Fix C: leads.status lifecycle + report/generate column fix | LIVE |
| bdb4742 | Auth: Google/Microsoft OAuth login, AI action plan on report, PDF download | DEPLOYING |
| 4d89f15 | Fix slug collision ([id] → [leadId] for action-plan route) | DEPLOYING |
| 4d5ea8a | Fix auth SSR crash: createClient moved inside component scope | DEPLOYING |

## Auth Setup (Supabase Dashboard — SureThing handles via API)

Supabase site_url and uri_allow_list already configured by SureThing via API.
OAuth providers (Google, Azure) need Client IDs + Secrets — SureThing is creating these via browser automation.

### Supabase Callback URL (for OAuth apps)
`https://mhuofnkbjbanrdvvktps.supabase.co/auth/v1/callback`

## Feature Queue

### HQ-2: Benchmarking Panel (Forge next task)
- Location: `src/app/report/[id]/page.tsx` — add below dimension scores
- Show 'How you compare' section: org score vs. industry median per dimension
- Use static benchmark data (seed with industry averages — see below)
- For each dimension, show: org score vs. industry median (teal bar vs. grey bar)
- Industry averages (use these as static seed data):
  ```
  IT Infrastructure & Cloud: 52
  Cybersecurity: 45
  Data & Analytics: 48
  Process Automation: 43
  Digital Customer Experience: 56
  Workforce & Digital Culture: 41
  Innovation & Strategy: 38
  Governance & Compliance: 50
  ```
- Label: 'Industry median' (light grey bar behind teal score bar)
- Target: `staging` branch, gate checks, RELAY_COMMIT when ready

### HQ-3: Email Report Delivery
- Trigger: after `leads.status` → 'completed'
- Send email via Resend with report URL + score summary

### HQ-4: Shared Report Link
- Public token-protected URL for sharing report with stakeholders
- `/report/share/[token]` route — no auth required to view

## Environment Variables (all set in Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
CEREBRAS_API_KEY
NEXT_PUBLIC_APP_URL=https://connai.linkgrow.io
```

## Supabase Tables

```
leads: id, org_name, email, status (pending|interviewed|completed), captured_at
interviews: id, lead_id, stakeholder_name, stakeholder_role, interview_token, status (pending|in_progress|complete), completed_at, answers
reports: id, lead_id, interview_id, overall_score, dimension_scores (jsonb), generated_at
chat_messages: id, interview_id, role, content, created_at
```
