import { NextResponse } from 'next/server'
import crypto from 'crypto'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function POST(request: Request) {
  if (!PAYSTACK_SECRET_KEY) {
    console.error('Paystack secret key is not configured.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const signature = request.headers.get('x-paystack-signature')
  const body = await request.text()

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    console.warn('Invalid Paystack webhook signature received.')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  // --- Handle Paystack Event ---
  // Example: charge.success
  if (event.event === 'charge.success') {
    const reference = event.data.reference
    // 1. Verify transaction status again with Paystack API to be sure
    // 2. Look up the transaction in your database using the reference
    // 3. Update the order/user status to 'paid'
    // 4. Grant access to the report
    console.log(`Payment successful for reference: ${reference}. Fulfilling order...`)
  }

  // Acknowledge receipt of the event
  return NextResponse.json({ status: 'success' })
}
