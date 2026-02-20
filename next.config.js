/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phase 1: landing page only — auth/API routes disabled until env vars are configured
  // This allows Vercel to build and deploy without Supabase/Stripe/Gemini keys
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
