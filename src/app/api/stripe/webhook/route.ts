import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { org_id, credits, pack_type } = session.metadata ?? {}

    if (org_id && credits) {
      const supabase = createClient()

      // Add credits to org
      const { data: org } = await supabase
        .from('organisations')
        .select('pack_credits_remaining')
        .eq('id', org_id)
        .single()

      if (org) {
        await supabase.from('organisations').update({
          pack_credits_remaining: org.pack_credits_remaining + parseInt(credits),
          plan_type: pack_type ?? 'starter',
        }).eq('id', org_id)
      }

      // Update payment record
      await supabase.from('payments').update({
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
      }).eq('stripe_session_id', session.id)
    }
  }

  return NextResponse.json({ received: true })
}
