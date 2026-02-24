import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(req: NextRequest) {
  const { token, email } = await req.json();
  if (!token || !email) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { error } = await supabase
    .from('interviews')
    .update({ stakeholder_email: email, status: 'in_progress' })
    .eq('interview_token', token);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
