const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co https://api.groq.com https://api.cerebras.ai https://api.stripe.com https://api.resend.com wss://*.supabase.co",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  webpack: (config) => {
    const stub = path.resolve(__dirname, 'src/lib/phase1-stub.js')
    config.resolve.alias = {
      ...config.resolve.alias,
      // @supabase/ssr is NOT installed — keep stubbed to avoid module-not-found
      '@supabase/ssr': stub,
      // stripe and stripe-js are stubbed client-side; server routes use raw fetch
      'stripe': stub,
      '@stripe/stripe-js': stub,
      '@google/generative-ai': stub,
      // Note: jsPDF is used server-side in PDF route — NOT stubbed
    }
    return config
  },
}

module.exports = nextConfig
