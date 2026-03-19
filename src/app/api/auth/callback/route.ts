import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const origin = requestUrl.origin

  if (!code) {
    // No code param \u2014 redirect home with error
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  // Initialise Supabase client inside the handler (never at module level \u2014 SSR pre-render safety)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  // If a specific ?next= was provided, honour it
  if (next) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Check if this is a new user (no leads yet) \u2014 if so, send to onboarding
  try {
    const userEmail = sessionData?.user?.email
    if (userEmail && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { data: leads } = await serviceClient
        .from('leads')
        .select('id')
        .eq('owner_email', userEmail)
        .limit(1)

      if (!leads || leads.length === 0) {
        // New user \u2014 send to onboarding (which redirects to /audit/new)
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  } catch (e) {
    // Non-fatal \u2014 fall through to /dashboard if check fails
    console.warn('[auth/callback] onboarding check failed:', e)
  }

  // Returning user \u2014 go to dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}
