import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/interviews?lead_id=eq.${token}&select=id,status`,
    {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const interviews: { id: string; status: string }[] = await res.json();
  const total = interviews.length;
  const completed = interviews.filter((i) => i.status === 'complete').length;

  if (total === 0) return NextResponse.json({ error: 'No interviews yet' }, { status: 404 });

  return NextResponse.json({
    completedCount: completed,
    totalCount: total,
    dimensions: [],
    partial: completed > 0 && completed < total,
  });
}
