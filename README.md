# 🔭 Linkgrow Lense

> AI-powered digital maturity audits — at 42% of consultant cost.

**URL:** lense.linkgrow.io  
**Stack:** Next.js 14 + Supabase + Vercel + Gemini 2.0 Flash + Stripe

---

## 🚀 Deploy in 5 minutes (Vercel)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import `Hikoska/linkgrow-lense`
3. Add environment variables (copy from `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy — done. Set `lense.linkgrow.io` CNAME to your Vercel deployment URL.

---

## 🗄️ Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → run the migration in `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and keys to Vercel env vars

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── page.tsx                    # Landing page (pricing, CTA)
│   ├── auth/
│   │   ├── login/page.tsx          # Login
│   │   └── signup/page.tsx         # Signup
│   ├── dashboard/page.tsx          # Client dashboard
│   ├── onboarding/page.tsx         # Company setup wizard
│   ├── interview/[id]/page.tsx     # AI interview (Gemini)
│   ├── report/[id]/page.tsx        # Report viewer (free/paid gated)
│   ├── checkout/page.tsx           # Stripe pack purchase
│   └── api/
│       ├── auth/callback/route.ts  # Supabase OAuth callback
│       ├── interview/start/route.ts
│       ├── interview/message/route.ts
│       ├── report/generate/route.ts
│       └── stripe/
│           ├── checkout/route.ts
│           └── webhook/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   └── server.ts               # Server Supabase client
│   ├── gemini.ts                   # Gemini interview engine
│   ├── stripe.ts                   # Stripe helpers
│   └── report.ts                   # Report generator
└── components/
    ├── ui/                         # Shared UI components
    ├── interview/                  # Interview UI
    └── report/                     # Report viewer
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

- `main` — production (lense.linkgrow.io)
- `dev` — staging (Vercel preview URL)
- `feature/*` — feature work → PR into dev
