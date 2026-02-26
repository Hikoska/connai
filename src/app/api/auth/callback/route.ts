import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  const origin = requestUrl.origin

  if (!code) {
    // No code param — redirect home with error
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  // Initialise Supabase client inside the handler (never at module level — SSR pre-render safety)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  // Success — redirect to dashboard (or wherever `next` param says)
  return NextResponse.redirect(`${origin}${next}`)
}
