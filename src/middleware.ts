import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/audit', '/account']
const PUBLIC_EXCEPTIONS = ['/audit/new']

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
  const sessionCookie =
    request.cookies.get('next-auth.session-token') ??
    request.cookies.get('__Secure-next-auth.session-token')
  if (!sessionCookie) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
