import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { reportId } = await req.json();
    if (!reportId) {
      return NextResponse.json({ error: 'reportId required' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://connai.linkgrow.io';
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    // success_url: no ?paid=true param — payment state is verified server-side
    // via report_payments DB record (written by webhook). The client re-fetches
    // /api/report/[id]/paid-status on load to determine gate state.
    const body = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': '4900',
      'line_items[0][price_data][product_data][name]': 'Connai AI Action Plan',
      'line_items[0][price_data][product_data][description]': 'Full AI-generated action plan for your Digital Maturity Report',
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${baseUrl}/report/${reportId}?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${baseUrl}/report/${reportId}`,
      'metadata[report_id]': reportId,
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err?.error?.message || 'Stripe error' }, { status: 500 });
    }

    const session = await res.json();
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
