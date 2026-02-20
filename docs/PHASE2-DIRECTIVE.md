# Connai — Phase 2 Build Directive
**Issued by SureThing | 2026-02-20**

---

## UX Architecture (Critical — Read First)

The homepage (`src/app/page.tsx`) is the primary product surface — not a marketing page. But it must serve two types of visitors simultaneously:

1. **Ready visitor** — lands and immediately starts chatting. No friction.
2. **Passive visitor** — not ready to engage yet. Needs ambient context to understand what Connai is before they type anything.

The solution: **minimal ambient layer + chat as centrepiece.**

### Layout
```
┌──────────────────────────────────────────────────┐
│  [Connai by Linkgrow]              [Login]  │  ← minimal nav, no menu
├──────────────────────────────────────────────────┤
│                                              │
│   Understand where your organisation         │  ← 2-line tagline, large, centred
│   stands digitally — in 30 minutes.          │
│                                              │
├──────────────────────────────────────────────────┤
│                                              │
│   ┌────────────────────────────────────┐   │
│   │ Connai: Hi — I'm Connai. I help     │   │  ← chat window, auto-opened
│   │ organisations understand where they │   │     with agent's opening message
│   │ stand digitally and what to do       │   │     already visible (no click)
│   │ about it. Want to start with yours?  │   │
│   │ Takes ~30 min.                       │   │
│   │                                      │   │
│   │ [Type your reply...]           [Send] │   │
│   └────────────────────────────────────┘   │
│                                              │
└──────────────────────────────────────────────────┘
```

### Ambient context rules
- **Tagline only** — one clear headline above the chat. No bullet points, no feature lists, no "how it works" section.
- Tagline copy: *"Understand where your organisation stands digitally — in 30 minutes."*
- The agent's opening message itself serves as the secondary context layer — it's visible without any user action, so passive readers absorb it naturally.
- No scrolling required to see both the tagline and the opening message.
- No "Get Started" CTA button — the chat input IS the call to action.

---

## Agent Journey (all inside one chat on `/`)

1. **Discovery** — agent introduces Connai, asks what the visitor wants to understand about their organisation
2. **Scoping** — gathers org name, industry, team size, focus areas conversationally
3. **Account creation** — agent collects email mid-conversation, Supabase `signUp()` called silently, user never sees a form. Agent confirms: *"Got it — I'll set up your account now. You'll get a confirmation link at [email] but you can continue here in the meantime."*
4. **Interview briefing** — agent transitions smoothly into the digital maturity interview
5. **Report delivery** — agent delivers the completed PDF report and next steps

---

## Specific File Changes

### `src/app/page.tsx`
- Minimal nav: logo left, Login link right
- Tagline: *"Understand where your organisation stands digitally — in 30 minutes."*
- Full `<ChatInterface />` below tagline, pre-loaded with agent opening message
- No other content

### `src/app/onboarding/page.tsx`
- Redirect to `/`

### `src/app/auth/signup/page.tsx`
- Deprecated — account creation happens inside chat API

### `src/app/auth/login/page.tsx`
- Keep as minimal route — magic link only, no password form

### `src/app/dashboard/page.tsx`
- Phase 2 stub: list of past audits with PDF download links

### `/api/chat`
- System prompt encodes full state machine: discovery → scoping → account_creation → interview → report
- Gate account creation until email collected and validated
- On email: call Supabase `signUp()`, send magic link, continue conversation without interruption

---

## Tech Notes

- **Model**: `meta-llama/llama-3.3-70b-instruct:free` via OpenRouter (pinned — do not change without flag)
- **Auth**: Supabase magic link flow (no passwords) — **new Supabase project** (do not reuse paused Test Project)
- **Vercel**: Project ID `prj_VnYb3T5ju6KWQAebaW4t0PROGLwb` — linked to GitHub repo (repoId `1161976466`, confirmed)
- **SSO protection**: Disabled (confirmed via PATCH)

---

## Definition of Done (Phase 2)

- [ ] Homepage: tagline visible above chat, no other marketing content
- [ ] Agent opening message pre-loaded — visible without user action
- [ ] Passive visitor can read tagline + opening message and understand the product without typing
- [ ] Active visitor can start chatting immediately — no clicks required
- [ ] Full flow works end-to-end: discovery → account created → interview started
- [ ] Supabase row created for new user when email is provided
- [ ] Magic link email sent via Supabase Auth
- [ ] `/dashboard` shows list of past audits
- [ ] Staging URL `connai.linkgrow.io` returns HTTP 200

**Report progress to #claw1-reports. Ping @SureThing (<@1474298693229477888>) when Phase 2 is deployed to staging.**
