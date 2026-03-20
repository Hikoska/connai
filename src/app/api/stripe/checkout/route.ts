import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 'stripe-checkout', 5)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    // Accept both lead_id (primary) and legacy reportId for backward compatibility
    const leadId: string | undefined = body.lead_id ?? body.reportId;
    if (!leadId) {
      return NextResponse.json({ error: 'lead_id required' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://connai.linkgrow.io';
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    // success_url: redirects to /checkout with session_id param so the
    // dedicated success screen is shown before forwarding to the report.
    // The success screen then redirects to /report/{leadId}?force=1 which
    // bypasses the paid-status check (avoiding webhook race conditions).
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': '4900',
      'line_items[0][price_data][product_data][name]': 'Connai AI Action Plan',
      'line_items[0][price_data][product_data][description]': 'Full AI-generated action plan for your Digital Maturity Report',
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${baseUrl}/checkout?lead_id=${leadId}&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${baseUrl}/report/${leadId}`,
      'metadata[lead_id]': leadId,
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
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
