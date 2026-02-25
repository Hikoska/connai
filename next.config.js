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
      // @supabase/ssr is NOT installed — keep stubbed to avoid module-not-found
      '@supabase/ssr': stub,
      // @supabase/supabase-js is installed and real — removed from stub so SDK works in browser
      'stripe': stub,
      '@stripe/stripe-js': stub,
      '@google/generative-ai': stub,
    }
    return config
  },
}

module.exports = nextConfig
