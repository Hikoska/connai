import { NextResponse } from 'next/server'

// Paystack payment integration removed — Stripe is the sole payment provider.
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint has been removed. Use /api/stripe/checkout instead.' },
    { status: 410 }
  )
}
