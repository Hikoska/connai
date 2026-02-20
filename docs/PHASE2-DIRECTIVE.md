# Connai — Phase 2 Build Directive
**Issued by SureThing | 2026-02-20**

---

## UX Architecture Change (Critical — Read First)

The homepage (`src/app/page.tsx`) **is** the product. Not a marketing page. Not a CTA funnel.

A visitor lands → they are immediately inside a conversation with the Connai agent. No "Get Started" button. No separate `/onboarding` route. The agent handles everything in one continuous thread:

1. **Discovery** — agent introduces Connai, asks what the visitor wants to understand about their organisation
2. **Scoping** — gathers org name, industry, team size, focus areas conversationally
3. **Account creation** — agent collects email mid-conversation, Supabase creates the account silently in the background, user never sees a form
4. **Interview briefing** — agent transitions smoothly into the digital maturity interview
5. **Report delivery** — agent delivers the completed PDF report and next steps

The agent's tone drives first impression. It must not sound like a form in disguise. Warm, direct, intelligent.

---

## Specific Changes Required

### `src/app/page.tsx`
- Replace current marketing page content with `<ChatInterface />` component
- Agent opening message (suggested): *"Hi — I'm Connai. I help organisations understand where they stand digitally and what to do about it. Want to start with your own? It takes about 30 minutes and you'll walk away with a clear picture."*
- Full viewport, minimal chrome — just the chat

### `src/app/onboarding/page.tsx`
- Route can be deprecated or redirect to `/` — the onboarding journey now starts on the homepage

### `src/app/auth/signup/page.tsx`
- No longer needed as a route — account creation happens inside the homepage chat
- Supabase `signUp()` called programmatically from the chat API when email is collected
- The agent says something like: *"Got it — I'll set up your account now. You'll get a confirmation link at [email] but you can continue here in the meantime."*

### `src/app/auth/login/page.tsx`
- Keep as minimal route — returning users can paste a magic link or enter email to get a new one
- Agent on homepage can detect returning users: *"Welcome back — want to run a new audit or pick up where you left off?"*

### `src/app/dashboard/page.tsx`
- Phase 2 stub → simple list of past audits with PDF download links
- Agent is still the primary interface — dashboard is secondary reference

### Chat API (`/api/chat`)
- System prompt must encode the full agent journey (discovery → scoping → account creation → interview → report)
- State machine: track conversation phase and gate account creation to after email is collected and validated
- On email collection: call Supabase `signUp()`, send magic link, continue conversation without interruption

---

## Phase 2 Tech Notes

- **Model**: `meta-llama/llama-3.3-70b-instruct:free` via OpenRouter (pinned — do not change without flag)
- **Auth**: Supabase magic link flow (no passwords) — create new Supabase project for Phase 2 (do not reuse paused Test Project)
- **Vercel**: Project ID `prj_VnYb3T5ju6KWQAebaW4t0PROGLwb` — repo link being established via numeric ID `1161976466`
- **SSO protection**: Must be disabled via `PATCH /v9/projects/prj_VnYb3T5ju6KWQAebaW4t0PROGLwb` with `ssoProtection: null`

---

## Definition of Done (Phase 2)

- [ ] Homepage loads as full-screen chat — no marketing content visible
- [ ] Agent opens conversation without any user action required
- [ ] User can complete the full flow (discovery → account created → interview started) without leaving the chat
- [ ] Supabase row created for new user when email is provided
- [ ] Magic link email sent via Supabase Auth
- [ ] `/dashboard` shows list of past audits (even if empty for new users)
- [ ] Staging URL `connai.linkgrow.io` returns HTTP 200 with Connai branding

**Report progress to #claw1-reports. Ping @SureThing (<@1474298693229477888>) when Phase 2 is deployed to staging.**
