import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  const { token, answers } = await req.json();
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://connai.linkgrow.io';

  const supaHeaders = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  // 1. Mark interview complete — filter by token column
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/interviews?token=eq.${token}`,
    {
      method: 'PATCH',
      headers: {
        ...supaHeaders,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        status: 'complete',
        completed_at: new Date().toISOString(),
        transcript: answers ?? [],
      }),
    }
  );

  if (!patchRes.ok) {
    const err = await patchRes.text().catch(() => patchRes.statusText);
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const updated: any[] = await patchRes.json();
  if (!updated.length) {
    return NextResponse.json({ ok: true, status_updated: false });
  }

  const interview = updated[0];
  const leadId = interview.lead_id;
  if (!leadId) return NextResponse.json({ ok: true, status_updated: false });

  // 2. Count all interviews for this lead
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/interviews?lead_id=eq.${leadId}&select=id,status`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    }
  );

  if (!countRes.ok) return NextResponse.json({ ok: true, status_updated: false });

  const allInterviews: any[] = await countRes.json();
  const total = allInterviews.length;
  const completed = allInterviews.filter((iv) => iv.status === 'complete').length;

  // 3. Determine new leads.status
  let newLeadStatus: string | null = null;
  if (completed === total && total > 0) {
    newLeadStatus = 'interviews_complete';
  } else if (completed > 0) {
    newLeadStatus = 'interviews_in_progress';
  }

  if (newLeadStatus) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`,
      {
        method: 'PATCH',
        headers: supaHeaders,
        body: JSON.stringify({ status: newLeadStatus }),
      }
    );
  }

  // 4. Fire-and-forget report generation when all interviews complete
  if (newLeadStatus === 'interviews_complete') {
    // Trigger generate for this interview token (no await — background)
    fetch(`${APP_URL}/api/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => { /* ignore — background task */ });
  }

  return NextResponse.json({ ok: true, status_updated: true, lead_status: newLeadStatus });
}
