import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supaHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

export async function PATCH(req: NextRequest) {
  const { token, answers } = await req.json();
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  // 1. Mark interview complete and return the row to get lead_id
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/interviews?interview_token=eq.${token}`,
    {
      method: 'PATCH',
      headers: {
        ...supaHeaders,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        status: 'complete',
        completed_at: new Date().toISOString(),
        answers: answers ?? null,
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
  if (total > 0 && completed === total) {
    newLeadStatus = 'completed';
  } else if (completed >= 1) {
    newLeadStatus = 'interviewed';
  }

  if (newLeadStatus) {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`, {
      method: 'PATCH',
      headers: { ...supaHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: newLeadStatus }),
    });
  }

  // 4. If all interviews complete, fire-and-forget report generation
  if (newLeadStatus === 'completed') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://connai.linkgrow.io';
    fetch(`${appUrl}/api/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interview_token: token }),
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    status_updated: !!newLeadStatus,
    lead_status: newLeadStatus,
    completed_count: completed,
    total_count: total,
  });
}
