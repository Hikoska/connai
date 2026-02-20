# Linkgrow Lense — MVP Spec v1.2 (Definitive)
*Feb 20, 2026 — Hybrid: v1.0 framework + Sofap practical elements*

## Product Summary

**Linkgrow Lense** is a conversational AI platform that interviews employees across your organization, assesses digital maturity across 8 dimensions, identifies transformation opportunities, and delivers a prioritized action plan.

**One-liner:** *"An AI consultant that interviews your team and tells you exactly what to fix first."*

**Interaction model:** Guided conversational AI interview (30-45 min text chat per employee). AI adapts questions in real-time based on answers — replicates Ludovic's in-person audit interview style. Not a questionnaire.

## Assessment Framework — 8 Dimensions

| # | Dimension | What It Covers |
|---|-----------|----------------|
| 1 | **IT Infrastructure & Cloud** | Hardware, hosting, cloud adoption, backup, disaster recovery |
| 2 | **Cybersecurity** | Access control, incident response, awareness training, compliance |
| 3 | **Data & Analytics** | Data management, reporting, BI tools, data-driven decision-making |
| 4 | **Process Automation** | Manual vs automated processes, workflow tools, integration maturity |
| 5 | **Digital Customer Experience** | Website, eCommerce, CRM, digital sales channels, support tools |
| 6 | **Workforce & Digital Culture** | Skills, training, change readiness, digital leadership, collaboration tools |
| 7 | **Innovation & Strategy** | Digital roadmap, R&D, emerging tech awareness, competitive positioning |
| 8 | **Governance & Compliance** | IT governance, data privacy, regulatory adherence, audit readiness |

### Maturity Scale (per dimension)

| Level | Name | Description |
|-------|------|-------------|
| 1 | **Ad Hoc** | No formal processes; reactive, fragmented |
| 2 | **Developing** | Some awareness; basic tools in place |
| 3 | **Defined** | Structured processes; consistent tools |
| 4 | **Managed** | Data-driven optimization; integrated systems |
| 5 | **Optimized** | Continuous improvement; industry-leading |

### Opportunity Scoring (Sofap-inspired, per finding)

Every identified opportunity gets star-rated:

| Metric | Scale |
|--------|-------|
| **Difficulty** | ★ Low / ★★ Med / ★★★ High |
| **Cost** | ★ Low / ★★ Med / ★★★ High |
| **Impact** | ★ Low / ★★ Med / ★★★ High |

**Priority buckets:** Quick Wins (low effort + high impact) → Strategic Projects → Major Initiatives → Nice-to-Have

## Conversational Interview Flow (6 Phases)

1. **Warm-up & Context** (5 min) — role, tenure, department
2. **A Day in Their Life** (10 min) — typical day walkthrough, surface pain points
3. **Challenges & Bottlenecks** (10 min) — frustrations, follow pain signals
4. **Process Deep-Dive** (10 min) — step-by-step of 1-2 key processes
5. **Ideal World** (5 min) — aspirational gap = opportunity
6. **Wrap-up** (2 min) — open floor

AI maps conversation signals to: (a) dimension scores, (b) specific opportunities with star ratings.

## Report Output — Visual Slide Deck (PDF)

**Format:** 16:9 landscape PDF, visual-first

1. **Title Page** — dual branding (Linkgrow Lense + client logo)
2. **Executive Summary** — spider chart (8 dimensions), overall maturity score, key headline findings
3. **Dimension Deep-Dives** (1-2 slides each) — current state, maturity level, key evidence from interviews
4. **Opportunity Grid** — all opportunities with ★ ratings, sorted by priority
5. **Cross-Pillar Priority Matrix** — 2×2 visual: Quick Wins / Strategic / Major / Nice-to-Have
6. **Cultural & Strategic Context** — change readiness, leadership buy-in, industry benchmarks
7. **Recommended Roadmap** — timeline: Quick wins (1-3mo) → Strategic (3-6mo) → Major (6-12mo)
8. **Closing** — next steps, CTA, contact info

**Design:** Dark teal + white + light grey. Sans-serif. Stock photography. Progress bars. Star ratings.

## User Flows

### Flow A: Client Admin
Sign up → Company brief (AI interview about the org) → Add employees → AI sends invitations → Monitor dashboard → Receive report → Download & share

### Flow B: Employee
Receive email → Click link (no account needed) → 30-45 min chat interview → Done

### Flow C: AI Pipeline
During conversation (tag dimensions + opportunities) → Post-conversation (score & categorize) → Cross-interview synthesis → Report generation → PDF → Delivery

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js + Tailwind + shadcn/ui |
| Backend/DB | Supabase (auth, DB, storage, edge functions) |
| Hosting | Vercel |
| AI Engine | **Gemini 2.5 Pro** (dev/test) → Claude/GPT (production) |
| Report Gen | React-PDF or Puppeteer |
| Email | Resend |

## Pricing

| Tier | Price | Scope |
|------|-------|-------|
| Starter | TBD (>$199) | Up to 10 interviews |
| Professional | TBD (>$499) | Up to 25 interviews |
| Enterprise | Custom | Unlimited |

*Pricing to be calibrated after token consumption analysis during test runs.*

## Pilot Clients

- Sofap (existing Linkgrow client, original audit reference)
- Adapro (active Byrd & Partners engagement)
- 1-2 additional TBD
