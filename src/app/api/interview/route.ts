import { NextResponse } from 'next/server';

// Deprecated stub — this endpoint was replaced by /api/chat.
// Redirect all traffic to avoid 404s and dead code confusion.
export async function GET() {
  return NextResponse.redirect(new URL('/api/chat', process.env.NEXT_PUBLIC_APP_URL ?? 'https://connai.linkgrow.io'), 301);
}
export async function POST() {
  return NextResponse.redirect(new URL('/api/chat', process.env.NEXT_PUBLIC_APP_URL ?? 'https://connai.linkgrow.io'), 308);
}
