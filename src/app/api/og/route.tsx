import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

// ─── Supabase REST helper (edge-compatible, no SDK) ─────────────────────────
// Uses anon key — reads only public columns (org_name, overall_score).
// createClient must NEVER be called at module level (gate rule).
async function fetchLeadMeta(
  leadId: string,
  supabaseUrl: string,
  anonKey: string
): Promise<{ orgName: string | null; score: number | null }> {
  try {
    const url = `${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=org_name,overall_score&limit=1`
    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) return { orgName: null, score: null }
    const rows = await res.json()
    const row = Array.isArray(rows) ? rows[0] : null
    return {
      orgName: row?.org_name ?? null,
      score:
        typeof row?.overall_score === 'number' ? row.overall_score : null,
    }
  } catch {
    return { orgName: null, score: null }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  // ── Resolve display values ────────────────────────────────────────────────
  //
  //  Priority 1: ?leadId=  → fetch live org_name + overall_score from Supabase
  //  Priority 2: ?score=&companyName=  → use inline params (shared links, previews)
  //  Priority 3: fallback  → generic branded image (no score badge)
  //
  // Never call createClient at module level — all Supabase access is inside GET.

  let displayScore: number | null = null
  let displayCompany: string | null = null

  const leadId = searchParams.get('leadId')
  const scoreParam = searchParams.get('score')
  const companyParam = searchParams.get('companyName')

  if (leadId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (supabaseUrl && anonKey) {
      const meta = await fetchLeadMeta(leadId, supabaseUrl, anonKey)
      displayScore = meta.score
      displayCompany = meta.orgName
    }
  } else if (scoreParam !== null) {
    const parsed = parseInt(scoreParam, 10)
    displayScore = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : null
    displayCompany = companyParam ?? null
  }

  const hasScore = displayScore !== null

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: '#0E1117',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: '#0D5C63',
            display: 'flex',
          }}
        />

        {/* Logo row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '48px',
          }}
        >
          <span style={{ fontSize: '32px' }}>💬</span>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
            }}
          >
            Connai
          </span>
        </div>

        {/* Headline — dynamic when company name available */}
        <div
          style={{
            fontSize: displayCompany ? '54px' : '64px',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.1,
            marginBottom: '24px',
            maxWidth: '900px',
          }}
        >
          {displayCompany
            ? `${displayCompany}'s Digital Maturity Report`
            : 'AI Digital Maturity Audits'}
        </div>

        {/* Sub-headline */}
        <div
          style={{
            fontSize: '28px',
            color: '#9CA3AF',
            maxWidth: '780px',
            lineHeight: 1.5,
          }}
        >
          {hasScore
            ? 'AI-powered digital maturity audit — scored, benchmarked, and ready to act on.'
            : 'Days, not months. AI-powered interviews, structured reports, actionable insights.'}
        </div>

        {/* Score badge — shown only when a real score is available */}
        {hasScore && (
          <div
            style={{
              position: 'absolute',
              right: '80px',
              bottom: '80px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background:
                displayScore! >= 70
                  ? '#0D5C63'
                  : displayScore! >= 40
                  ? '#78350f'
                  : '#7f1d1d',
              borderRadius: '16px',
              padding: '24px 36px',
            }}
          >
            <span
              style={{
                fontSize: '56px',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1,
              }}
            >
              {displayScore}
            </span>
            <span style={{ fontSize: '16px', color: '#99D4D8', marginTop: '4px' }}>
              /100 maturity score
            </span>
          </div>
        )}

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            left: '80px',
            bottom: '40px',
            fontSize: '20px',
            color: '#4B5563',
            display: 'flex',
          }}
        >
          connai.linkgrow.io
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
