import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function POST(request: Request) {
  const { email, amount, metadata } = await request.json()

  if (!email || !amount) {
    return NextResponse.json({ error: 'Email and amount are required' }, { status: 400 })
  }

  if (!PAYSTACK_SECRET_KEY) {
    console.error('Paystack secret key is not configured.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const paystack_ref = `connai-${uuidv4()}`

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Amount in kobo
        reference: paystack_ref,
        metadata,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Paystack API Error:', data)
      return NextResponse.json({ error: 'Failed to initialize payment', details: data }, { status: 500 })
    }

    // Here, you would typically save the paystack_ref to your database
    // associated with the user or order before returning the auth URL.

    return NextResponse.json(data.data)

  } catch (error) {
    console.error('Error initializing Paystack transaction:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
