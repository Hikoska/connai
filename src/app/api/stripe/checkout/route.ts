import { NextRequest, NextResponse } from 'next/server'
import { stripe, PACK_PRICES } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { pack } = await req.json()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const packConfig = PACK_PRICES[pack]
  if (!packConfig) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: packConfig.name, description: `${packConfig.credits} AI interview credits` },
        unit_amount: packConfig.amount,
      },
      quantity: 1,
    }],
    metadata: {
      pack_type: pack,
      org_id: org?.id ?? '',
      user_id: user.id,
      credits: String(packConfig.credits),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
  })

  // Record pending payment
  await supabase.from('payments').insert({
    org_id: org?.id,
    stripe_session_id: session.id,
    pack_type: pack,
    amount_cents: packConfig.amount,
    currency: 'usd',
    status: 'pending',
    credits_added: packConfig.credits,
  })

  return NextResponse.json({ url: session.url })
}
