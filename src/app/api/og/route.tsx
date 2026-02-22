import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(_req: NextRequest) {
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
          <span style={{ fontSize: '32px' }}>🤕</span>
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

        {/* Headline */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.1,
            marginBottom: '24px',
            maxWidth: '900px',
          }}
        >
          AI Digital Maturity Audits
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
          Days, not months. AI-powered interviews, structured reports, actionable insights.
        </div>

        {/* Score badge */}
        <div
          style={{
            position: 'absolute',
            right: '80px',
            bottom: '80px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#0D5C63',
            borderRadius: '16px',
            padding: '24px 36px',
          }}
        >
          <span style={{ fontSize: '56px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
            68
          </span>
          <span style={{ fontSize: '16px', color: '#99D4D8', marginTop: '4px' }}>
            /100 maturity score
          </span>
        </div>

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
