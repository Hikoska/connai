import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest) {
  const { token, email } = await req.json();
  if (!token || !email) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interviews?token=eq.${token}`,
    {
      method: 'PATCH',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ stakeholder_email: email, status: 'in_progress' }),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    return NextResponse.json({ error: err }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
