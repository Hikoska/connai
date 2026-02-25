import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Stripe sends raw body — disable body parsing
export const config = {
  api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  // Verify with Stripe (manual HMAC — avoids importing stripe SDK)
  const crypto = await import('crypto');
  const parts = sig.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts['t'];
  const v1 = parts['v1'];
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  if (expected !== v1) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const reportId = session.metadata?.report_id;
    const sessionId = session.id;

    if (reportId && sessionId) {
      // Record payment in Supabase via raw fetch (no createClient in API routes)
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supaUrl && supaKey) {
        await fetch(`${supaUrl}/rest/v1/report_payments`, {
          method: 'POST',
          headers: {
            apikey: supaKey,
            Authorization: `Bearer ${supaKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            lead_id: reportId,
            stripe_session_id: sessionId,
            paid_at: new Date().toISOString(),
            amount_cents: session.amount_total,
          }),
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
