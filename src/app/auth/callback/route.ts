import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Auth callback Route Handler.
 * Runs on the SERVER — exchanges the PKCE code for a session and writes
 * the session cookie via Set-Cookie response headers BEFORE the browser
 * ever touches /dashboard. This is the only reliable way to prevent the
 * middleware redirect loop with @supabase/ssr.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    // No code → something went wrong upstream, send back to login
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  // Build a response object we can attach cookies to
  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write each cookie into the redirect response headers
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`${origin}/auth/login?error=auth_error`)
  }

  // Session cookie is now in the response headers — browser will receive it
  // with the 302 redirect, so middleware on /dashboard will see a valid session.
  return response
}
