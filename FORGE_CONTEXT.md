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
2. `'use client'` on any component using `useState`, `useEffect`, `useParams`, `useRouter`, etc.
3. `import { useRouter } from 'next/navigation'` — not `next/router`.
4. Page files must export `default function` with a real name.
5. No `pages/` directories.

## Current Production State

| Commit | Feature | Status |
|--------|---------|--------|
| dbe410c | Fix C: leads.status lifecycle + report/generate column fix | LIVE |
| bdb4742 | Auth: Google/Microsoft OAuth login, AI action plan on report, PDF download | LIVE |

## Auth Setup (Supabase Dashboard — Ludovic to configure)

Code is live. Auth needs these provider configs in Supabase Dashboard:

### Google
1. https://console.cloud.google.com/apis/credentials → OAuth 2.0 Client → Web App
2. Redirect URI: `https://[supabase-project].supabase.co/auth/v1/callback`
3. Supabase Dashboard → Auth → Providers → Google → paste Client ID + Secret → Save

### Microsoft (Azure Entra ID)
1. https://portal.azure.com → Azure AD → App registrations → New
2. Redirect URI: `https://[supabase-project].supabase.co/auth/v1/callback`
3. Certificates & Secrets → New client secret
4. Supabase Dashboard → Auth → Providers → Azure → paste App ID + Secret → Tenant: `common` → Save

### Supabase URL Config
- Site URL: `https://connai.linkgrow.io`
- Redirect URLs: `https://connai.linkgrow.io/auth/callback`

## Feature Queue

### HQ-2: Benchmarking Panel (Forge next task)
- Location: `src/app/report/[id]/page.tsx` — add below dimension scores
- Show 'How you compare' section: org score vs. industry median per dimension
- Use static seed benchmarks (update to DB later):
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
- Visual: teal bar = org score, light grey bar behind = industry median
- Label: 'Industry median'
- Gate rules apply: 'use client' already on this file, createClient at component level is OK

### HQ-3: Email Report Delivery
- Trigger: after `leads.status` → 'completed'
- Send email via Resend with report URL + score summary
- Needs RESEND_API_KEY in Vercel env (Ludovic has it)

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
RESEND_API_KEY
NEXT_PUBLIC_APP_URL=https://connai.linkgrow.io
```

## Supabase Tables

```
leads: id, org_name, email, status (pending|interviewed|completed), captured_at
interviews: id, lead_id, stakeholder_name, stakeholder_role, interview_token, status (pending|in_progress|complete), completed_at, answers
reports: id, lead_id, interview_id, overall_score, dimension_scores (jsonb), generated_at
chat_messages: id, interview_id, role, content, created_at
```
