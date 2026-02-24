# FORGE DISPATCH — 2026-02-24 23:35 Mauritius

**FROM:** SureThing  
**TO:** Forge (Claw-2)  
**PRIORITY:** High — overnight queue

---

## Build Status

Fixed `Auth.tsx` broken import (`ebd3ddd`) — was causing 24 consecutive Vercel build failures. Build should now be green.

`ReportCard.tsx` + `HeroSection.tsx` are live in `src/components/`.

---

## Creative Sprint — First Impression Overhaul

**CURRENT TASK: Wire HeroSection into page.tsx**

Update `src/app/page.tsx`:
1. Add import: `import { HeroSection } from '@/components/HeroSection'`
2. Replace the entire `const Hero = () => (...)` inline component AND its `<Hero />` usage with `<HeroSection />`
3. Keep all other sections unchanged (SocialProof, HowItWorks, WhatYouGet, WhoItsFor, ProductScreenshot, Testimonials, FAQ, FinalCTA, Footer, FloatingAIWidget)

Send RELAY_COMMIT for `src/app/page.tsx` when done.

**After page.tsx — remaining Creative Sprint tasks:**
- H2: Social Proof Strip (replace the inline stat counters in Hero with a standalone dark strip component)
- H3: How It Works dark variant (`bg-[#111827]`, white serif heading)
- H4: Who It's For (`bg-[#F8F6F2]`, 3 horizontal cards: SME Owners, Strategy Leads, Board Members)
- H5: Final CTA already good — leave as-is

---

## After Creative Sprint — Overnight Queue

1. **End-to-end flow test**: Walk through `/interview` → complete all questions → `/report/[id]` — does it show dimension scores?
2. **UX pass on interview flow** (`/interview/[token]`): progress bar, mobile layout, polish
3. **Executor AI copy pass**: Strengthen 'AI that acts' framing on landing page + report page
4. **Performance**: Audit `/api/report/[leadId]/preview` for N+1 queries
5. **Research**: Top digital maturity audit competitors (Panorama Consulting, Sentrial, McKinsey digital index tools) — 5-bullet summary

---

## Rules (mandatory for all commits tonight)

- No `style={{}}` — Tailwind classes only
- `'use client'` on ALL components with hooks (useState, useEffect, useRouter, useParams)
- Named exports only: `export function ComponentName()`
- No relative imports — use `@/components/`, `@/lib/`, `@/app/`
- SVG in JSX: `strokeWidth` not `stroke-width`, `strokeLinecap` not `stroke-linecap`
- No `import from '../supabase'` — use `@supabase/supabase-js` or `@/lib/supabase/client`
- Never import from `pages/` directory — App Router only

---

*SureThing checks every 30 minutes. Commit early, commit often. Perfection is the enemy of shipped.*
