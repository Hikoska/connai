const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreTypeErrors: true,
  },
  webpack: (config) => {
    const stub = path.resolve(__dirname, 'src/lib/phase1-stub.js')
    config.resolve.alias = {
      ...config.resolve.alias,
      // @supabase/supabase-js removed from stub — SDK must be real in browser
      // @supabase/ssr removed — may be needed for server-side auth helpers
      'stripe': stub,
      '@stripe/stripe-js': stub,
      '@google/generative-ai': stub,
    }
    return config
  },
}

module.exports = nextConfig
