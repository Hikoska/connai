# Forge Context — Connai Sprint

> This file is the source of truth for Forge. Read it before every commit.

## Architecture

- **Next.js 14 App Router** — `src/app/` only. Never create `pages/` directories.
- **Supabase** — raw `fetch()` to REST API in all `/api/` routes. Never use `createClient` in API routes.
- **Client components** — `'use client'` on ALL files using hooks or browser APIs.
- **Navigation** — `import { useRouter } from 'next/navigation'` (never `next/router`).
- **Pages** — `export default function PageName()` (never anonymous `export default`).
- **Auth** — Supabase Auth with `@supabase/ssr`. `signInWithOAuth()` in client components only. Cookie exchange happens in a **Route Handler**, not a page component.

## Branch Rules

- Forge relay commits → `staging` branch ONLY. NEVER directly to `main`.
- SureThing owns `main` — it merges `staging` after verifying Vercel preview build is READY.
- RELAY_COMMIT means: commit your changes to `staging` and post `RELAY_COMMIT: [commit sha]` in #surething-to-forge.

## Gate Rules (will break build if violated)

### Gate 1 — No `createClient` in API routes
Use raw fetch to Supabase REST API:
```ts
const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tablename?...`, {
  headers: {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  }
})
```

### Gate 2 — No module-level `createClient` in ANY page
Static routes are pre-rendered at build time. Module-level `createClient` crashes SSR:
```tsx
// ❌ WRONG — module level, crashes at build time
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)

// ✅ CORRECT — inside handler or useEffect
const signIn = async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)
}
```
Or add `export const dynamic = 'force-dynamic'` to opt out of static generation.

### Gate 3 — `'use client'` must be absolute first line
`'use client'` must be the **first line** of any client component. No imports before it.

### Gate 4 — `useRouter` from `next/navigation`
`import { useRouter } from 'next/navigation'` — never `next/router`.

### Gate 5 — Named page exports
Page files must export `default function` with a real name (never anonymous).

### Gate 6 — No `pages/` directories
All routes under `src/app/` only.

### Gate 12 — All routes under `src/app/`
Never create route files in root-level `app/`. Only `src/app/` is valid.

### Gate 13 — `'use client'` absolute first line (enforced)
If any import appears before `'use client'`, Next.js treats the file as a Server Component and all hooks fail.

### Gate 14 — No JSX in `.ts` API route files
API routes are `.ts` (not `.tsx`). Never write JSX markup in them.

### Gate 16 — `useSearchParams()` needs Suspense wrapper
Any component calling `useSearchParams()` must be wrapped in `<Suspense>`.

### Gate 17 — `@supabase/ssr` peer dependency (CRITICAL)
Never add `@supabase/ssr` to `package.json` without also setting `@supabase/supabase-js` to `^2.43.4` or higher.
`@supabase/ssr@0.5.x` requires `supabase-js ^2.43.4` as a peer dep. Mismatched versions cause `npm install` to fail on Vercel, taking the whole site down.

**Current locked versions:**
```json
"@supabase/supabase-js": "^2.43.4",
"@supabase/ssr": "^0.5.2"
```

### Gate 18 — No `page.tsx` alongside `route.ts`
Next.js App Router **cannot have both `page.tsx` and `route.ts` in the same directory segment.**
This causes a `lint_or_type_error` build failure: "Route cannot be used as both a Route Handler and a Page."
- `/auth/callback/` has `route.ts` only — do NOT add a `page.tsx` there.
- As a rule: if a segment has `route.ts`, it must not have `page.tsx`, and vice versa.

---

## Auth Architecture (current — do not revert)

Connai uses `@supabase/ssr` for cookie-based sessions that work across client and server.

### Key files
| File | Role |
|------|------|
| `src/lib/supabase/client.ts` | `createBrowserClient()` for client components |
| `src/lib/supabase/server.ts` | `createServerSideClient()` for server components + middleware |
| `src/app/auth/callback/route.ts` | **Route Handler** — exchanges PKCE code server-side, writes cookie via `Set-Cookie` header on redirect |
| `middleware.ts` | Calls `createServerSideClient` + `getUser()` on every request; protects `/dashboard`, `/admin`, `/audit`, `/account` |

### Why route.ts (not page.tsx) for /auth/callback
Client-side `exchangeCodeForSession` sets the cookie **after** the redirect to `/dashboard` is in flight. Middleware runs before the cookie is written, sees no session, and bounces the user back to `/auth/login` → infinite loop.

A server-side Route Handler exchanges the code on the server and writes the cookie into the **`Set-Cookie` response headers of the redirect itself**. The browser receives both the cookie and the redirect in one response, so middleware on `/dashboard` sees the session immediately.

### Magic link rate limit
Supabase free plan: **2 magic link emails per hour** (project-wide). Raising this requires custom SMTP:
- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL` in Supabase Dashboard.
- Recommended provider: Resend.

---

## Current Production State

| Commit | Feature | Status |
|--------|---------|--------|
| a015da6 | AUTH-FIX-V3-HOTFIX: delete page.tsx conflict | LIVE ✅ |
| 86f1203 | AUTH-FIX-V3: /auth/callback → server Route Handler | LIVE ✅ |
| 9607549 | AUTH-FIX-V2: supabase-js ^2.43.4 + @supabase/ssr@0.5.2 | LIVE ✅ |

**Prod URL:** https://connai.linkgrow.io

---

## Pending User Actions (not Forge)

1. Run `supabase/migrations/20260320_sprint_columns.sql` in Supabase SQL Editor
2. Set Vercel env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_REPORT_UNLOCK_TOKEN`
3. Configure custom SMTP in Supabase for magic link (Resend recommended)
4. CL-36: `ALTER TABLE interviews ADD COLUMN stakeholder_comment TEXT`

---

## Environment Variables (all set in Vercel)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# AI
GROQ_API_KEY
CEREBRAS_API_KEY

# Stripe (required for paid reports)
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET

# App
NEXT_PUBLIC_APP_URL=https://connai.linkgrow.io
ADMIN_PASSWORD
NEXT_PUBLIC_REPORT_UNLOCK_TOKEN
```

---

## Supabase Schema

```
leads:
  id, org_name, industry, email, status (pending|interviewed|completed), captured_at

interviews:
  id, lead_id, stakeholder_name, stakeholder_role, interview_token,
  status (pending|in_progress|complete), completed_at, answers,
  transcript, first_message_at, action_plan
  [pending CL-36: stakeholder_comment TEXT]

reports:
  id, lead_id, interview_id, overall_score,
  dimension_scores (jsonb), exec_tier, generated_at

chat_messages:
  id, interview_id, role, content, created_at
```

---

## Feature Queue

### HQ-3: Email Report Delivery
- Trigger: after `leads.status` → 'completed'
- Send email via Resend with report URL + score summary

### HQ-4: Shared Report Link
- Public token-protected URL for sharing report with stakeholders
- `/report/share/[token]` route — no auth required to view
