const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    const stub = path.resolve(__dirname, 'src/lib/phase1-stub.js')
    config.resolve.alias = {
      ...config.resolve.alias,
      '@supabase/ssr': stub,
      '@supabase/supabase-js': stub,
      'stripe': stub,
      '@stripe/stripe-js': stub,
      '@google/generative-ai': stub,
    }
    return config
  },
}

module.exports = nextConfig
