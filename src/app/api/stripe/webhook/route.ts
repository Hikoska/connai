import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  const rawBody = await req.text();

  const crypto = await import('crypto');
  const parts = sig.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts['t'];
  const v1Sig = parts['v1'];

  if (!timestamp || !v1Sig) {
    return NextResponse.json({ error: 'Invalid signature format' }, { status: 400 });
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  if (expected !== v1Sig) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string;
      metadata?: { report_id?: string };
      amount_total?: number;
    };
    const reportId = session.metadata?.report_id;
    const sessionId = session.id;

    if (reportId && sessionId) {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supaUrl && supaKey) {
        // Idempotent insert — stripe_session_id has a UNIQUE constraint (migration CL-13).
        // Prefer: resolution=ignore-duplicates → ON CONFLICT DO NOTHING, so Stripe retries
        // (network blips, timeouts) are safe and won't produce duplicate payment records.
        await fetch(`${supaUrl}/rest/v1/report_payments`, {
          method: 'POST',
          headers: {
            apikey: supaKey,
            Authorization: `Bearer ${supaKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal,resolution=ignore-duplicates',
          },
          body: JSON.stringify({
            lead_id: reportId,
            stripe_session_id: sessionId,
            paid_at: new Date().toISOString(),
            amount_cents: session.amount_total ?? 4900,
          }),
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
