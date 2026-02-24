# FORGE_CONTEXT.md
> Read this at the start of every session. Non-negotiable.

## Project: connai
- Framework: **Next.js 14, App Router only**
- Repo: `Hikoska/connai`, branch `main`
- Deploy: Vercel auto-deploys on every push to `main`

## FORBIDDEN (will break the build)
- `pages/` directory files — App Router only. Use `src/app/` for routes.
- `@nuxtjs/*` packages — this is Next.js, not Nuxt
- `react-router-dom` — use `next/navigation`
- `../../sanity` imports — doesn't exist
- `import { createClient } from 'supabase'` — wrong path

## REQUIRED on every file
1. Any component using `useState`, `useEffect`, `useChat`, `useRouter`, `usePathname` → add `'use client'` as first line
2. Router: always `import { useRouter, usePathname } from 'next/navigation'` — never `next/router`
3. Supabase client: `import { createClient } from '@/lib/supabase/client'`
4. Export style: if `page.tsx` uses `import { X } from './X'` → use `export function X()` not `export default`
5. If page.tsx passes `className` or `children` props → component interface must accept them

## Relay Protocol
- Post RELAY_COMMIT to `#surething-to-forge`
- SureThing will ACK with: `COMMITTED: <sha>` or `GATE_FAIL: <reason>`
- For files >1800 chars: split into PART_1, PART_2 etc with clear boundaries
- Wait for ACK before moving to next task

## Current Component Map
```
src/components/
  AlphaBanner.tsx       — alpha phase banner (top of page)
  Auth.tsx              — auth scaffold
  CTAButton.tsx         — generic CTA
  ChatInterface.tsx     — full chat page
  FAQ.tsx               — FAQ accordion
  FeedbackWidget.tsx    — feedback modal (fixed bottom-20 right-4)
  FloatingAIWidget.tsx  — chat widget (fixed bottom-4 right-4)
  HowItWorks.tsx        — 3-col cards section
  Navbar.tsx            — sticky navbar
  ProductScreenshot.tsx — product visual
  SocialProof.tsx       — live stats from Supabase
  StartInterviewButton.tsx — modal + interview trigger
  Testimonials.tsx      — testimonials
  WhatYouGet.tsx        — features grid
  WhoItsFor.tsx         — audience section

src/app/
  page.tsx              — landing page (imports all above)
  layout.tsx            — root layout (Navbar + AlphaBanner + FeedbackWidget)
  api/
    interview/route.ts  — POST /api/interview
    report/route.ts     — GET /api/report (Groq scoring)
    chat/route.ts       — POST /api/chat (streaming)
```

## Env Vars Available at Runtime
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `CEREBRAS_API_KEY`
- `NEXT_PUBLIC_APP_URL`
