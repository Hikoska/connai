# Connai Phase 2 — Environment & Infra

## Supabase

- **Project**: connai-phase2
- **Region**: eu-west-1
- **URL**: `https://mhuofnkbjbanrdvvktps.supabase.co`
- **Anon key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odW9mbmtiamJhbnJkdnZrdHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MTI2MTMsImV4cCI6MjA4NzE4ODYxM30.eOrAKkyq0Kvk-bhHoBrzVX_djAQjrcTOzjX9nsV_QaM`
- **Service role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odW9mbmtiamJhbnJkdnZrdHBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYxMjYxMywiZXhwIjoyMDg3MTg4NjEzfQ.bApayCq8sBaD3cakgF1mrhe2gjWArKfpkNjhOALHsUA`

## Vercel env vars (already set in project)

| Key | Scope |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | production / preview / development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | production / preview / development |
| `SUPABASE_SERVICE_ROLE_KEY` | production / preview |

## Domain

- **Custom domain**: `connai.linkgrow.io` (added to Vercel project, verified)
- **DNS**: Namecheap — CNAME record for `connai` → `cname.vercel-dns.com.` needs to be added by Ludovic
- **Vercel preview URL**: `https://connai-osayk2v5g-ludovics-projects-19605101.vercel.app` (functional now)

## Local .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://mhuofnkbjbanrdvvktps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odW9mbmtiamJhbnJkdnZrdHBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYxMjYxMywiZXhwIjoyMDg3MTg4NjEzfQ.bApayCq8sBaD3cakgF1mrhe2gjWArKfpkNjhOALHsUA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odW9mbmtiamJhbnJkdnZrdHBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYxMjYxMywiZXhwIjoyMDg3MTg4NjEzfQ.bApayCq8sBaD3cakgF1mrhe2gjWArKfpkNjhOALHsUA
```
