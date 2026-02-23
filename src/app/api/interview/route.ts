import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stakeholder_email, organisation, country = 'MU', industry } = body;

    if (!stakeholder_email || !organisation) {
      return NextResponse.json(
        { error: 'stakeholder_email and organisation are required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ stakeholder_email, organisation, country, industry, status: 'pending' }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[/api/interview] Supabase error:', err);
      return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 });
    }

    const [interview] = await res.json();

    return NextResponse.json({
      id: interview.id,
      token: interview.token,
      interview_url: `/interview/${interview.token}`,
    });
  } catch (err) {
    console.error('[/api/interview] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
