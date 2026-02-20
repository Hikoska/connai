// Phase 1 stub — Supabase auth callback added in Phase 2
import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
}
