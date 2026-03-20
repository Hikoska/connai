# 🔭 Connai

> AI-powered digital maturity audits — at 42% of consultant cost.

**URL:** connai.linkgrow.io  
**Stack:** Next.js 14 + Supabase + Vercel + Gemini 2.0 Flash + Stripe

---

## 🚀 Deploy in 5 minutes (Vercel)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import `Hikoska/connai`
3. Add environment variables (copy from `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_REPORT_UNLOCK_TOKEN`
4. Deploy — done. Set `connai.linkgrow.io` CNAME to your Vercel deployment URL.

---

## 🗄️ Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/20260320_sprint_columns.sql` ← adds transcript, action_plan, exec_tier, timestamps
3. Copy your project URL and keys to Vercel env vars
4. Enable **Google** OAuth provider in Supabase Dashboard → Authentication → Providers
5. Set **Site URL** to `https://your-domain.com` and add `https://your-domain.com/auth/callback` to the redirect allow-list

---

## 💳 Stripe Setup

Connai uses Stripe for paid report packs. You need two things: API keys + a webhook.

### 1. API Keys
In your [Stripe Dashboard](https://dashboard.stripe.com/apikeys), copy:
- **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel
- **Secret key** → `STRIPE_SECRET_KEY` in Vercel

### 2. Webhook Registration
Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) and add an endpoint:

```
URL:    https://connai.linkgrow.io/api/stripe/webhook
Event:  checkout.session.completed
```

Copy the **Webhook signing secret** → `STRIPE_WEBHOOK_SECRET` in Vercel.

> ⚠️ Without the webhook, payments will process but report packs will **not** be credited — the `/api/stripe/webhook` handler is what unlocks the purchased pack in the database.

### 3. Report Unlock Token
Set `NEXT_PUBLIC_REPORT_UNLOCK_TOKEN` to any random string (e.g. `openssl rand -hex 16`). This is the fallback token that unlocks report previews on the `/report/[id]` page.

---

## 🔐 Authentication Architecture

Connai uses **Supabase Auth with `@supabase/ssr`** for cookie-based, server-aware sessions.

### Dependencies (version-locked — do not downgrade)
```json
"@supabase/supabase-js": "^2.43.4",
"@supabase/ssr": "^0.5.2"
```
> ⚠️ **Gate 17**: `@supabase/ssr@0.5.x` requires `supabase-js ^2.43.4` as a peer dependency.
> Never add `@supabase/ssr` without first ensuring `supabase-js` is `^2.43.4` or higher.
> Mismatched versions cause `npm install` to fail on Vercel, taking the site down.

### Auth Flow
```
User → /auth/login
  → supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })
  → [Google OAuth] → Supabase auth server
  → GET /auth/callback?code=...
    → Route Handler (route.ts) runs SERVER-SIDE
    → createServerClient exchanges PKCE code for session
    → Session cookie written via Set-Cookie response header
    → 302 → /dashboard (browser receives cookie + redirect together)
  → middleware.ts validates session from cookie → allows /dashboard
```

### Key files
| File | Role |
|------|------|
| `src/lib/supabase/client.ts` | `createBrowserClient()` — cookie-aware browser client |
| `src/lib/supabase/server.ts` | `createServerSideClient()` — SSR server client |
| `src/app/auth/callback/route.ts` | **Route Handler** — PKCE code exchange (server-side) |
| `middleware.ts` | Session validation on every protected route |

> ℹ️ `/auth/callback` is a **Route Handler** (`route.ts`), not a page. Do not add a `page.tsx` to that directory — Next.js App Router does not allow both in the same segment.

### Magic Link Rate Limit
Supabase's free plan caps magic link emails at **2 per hour** for the entire project.
To remove this limit, configure custom SMTP via Resend:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL` in Supabase Dashboard → Authentication → SMTP Settings

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── page.tsx                         # Landing page (pricing, CTA)
│   ├── auth/
│   │   ├── login/page.tsx               # Login (magic link + Google OAuth)
│   │   └── callback/route.ts            # ← Route Handler: PKCE code exchange
│   ├── dashboard/page.tsx               # Client dashboard
│   ├── onboarding/page.tsx              # Company setup wizard
│   ├── audit/
│   │   ├── new/page.tsx                 # Start audit
│   │   └── [id]/page.tsx               # Audit detail
│   ├── interview/[token]/
│   │   ├── page.tsx                     # AI interview (streaming, Gemini)
│   │   └── complete/page.tsx           # Interview complete + report pre-warm
│   ├── report/[id]/page.tsx             # Report viewer (free preview / paid full)
│   ├── checkout/page.tsx                # Stripe pack purchase
│   └── api/
│       ├── health/route.ts
│       ├── interviews/
│       │   ├── message/route.ts         # AI chat (qwen-qwq-32b, streaming)
│       │   └── start/route.ts
│       ├── leads/create/route.ts        # 5 req/60s rate limit
│       ├── invites/generate/route.ts    # 3 req/60s rate limit
│       ├── me/audits/route.ts           # 30 req/60s rate limit
│       ├── report/[id]/
│       │   ├── generate/route.ts
│       │   ├── executive-summary/route.ts
│       │   ├── action-plan/route.ts
│       │   ├── paid-status/route.ts
│       │   ├── preview/route.ts         # 3 req/60s rate limit
│       │   ├── pdf/route.ts             # 3 req/60s rate limit
│       │   └── feedback/route.ts        # 10 req/60s rate limit
│       ├── admin/auth/route.ts
│       └── stripe/
│           ├── checkout/route.ts
│           └── webhook/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # createBrowserClient (@supabase/ssr)
│   │   └── server.ts                    # createServerSideClient (@supabase/ssr)
│   ├── gemini.ts
│   ├── stripe.ts
│   └── report.ts
└── components/
    ├── ui/
    ├── interview/
    └── report/
```

---

## 💰 Pricing

| Pack | Interviews | Price | Per interview |
|------|-----------|-------|--------------|
| Starter | 5 | $500 | $100 |
| Team | 20 | $1,500 | $75 |
| Department | 50 | $3,500 | $70 |
| Company | 100 | $6,000 | $60 |

Free tier: 1 interview + watermarked report (conversion hook).

---

## 🌐 Branching

- `main` — production (connai.linkgrow.io)
- `staging` — Forge relay commits (AI agent) → SureThing merges to main after Vercel preview build passes
- `feature/*` — feature work → PR into staging
