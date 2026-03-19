import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimit(ip, 'paid-status', 30)) {
    return NextResponse.json({ paid: false }, { status: 429 })
  }
  if (!id) return NextResponse.json({ paid: false });

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) return NextResponse.json({ paid: false });

  // Query report_payments using service role key (bypasses RLS)
  const res = await fetch(
    `${supaUrl}/rest/v1/report_payments?lead_id=eq.${encodeURIComponent(id)}&limit=1&select=id`,
    {
      headers: {
        apikey: supaKey,
        Authorization: `Bearer ${supaKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) return NextResponse.json({ paid: false });
  const rows = await res.json();
  return NextResponse.json({ paid: Array.isArray(rows) && rows.length > 0 });
}
