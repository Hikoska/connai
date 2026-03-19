import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/audit', '/account']
const PUBLIC_EXCEPTIONS = ['/audit/new']

// Supabase auth cookies — supabase-js v2 sets 'sb-<project-ref>-auth-token'
// Project ref: mhuofnkbjbanrdvvktps
// It also sets chunked variants: sb-...-auth-token.0, sb-...-auth-token.1 etc.
const SB_COOKIE_PREFIX = 'sb-mhuofnkbjbanrdvvktps-auth-token'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/fonts/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const needsAuth = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  const isException = PUBLIC_EXCEPTIONS.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!needsAuth || isException) return NextResponse.next()

  // Check for Supabase session cookie (base or any chunk)
  const hasSession = request.cookies.getAll().some(
    c => c.name === SB_COOKIE_PREFIX || c.name.startsWith(SB_COOKIE_PREFIX + '.')
  )

  if (!hasSession) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
