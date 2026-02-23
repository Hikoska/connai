import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function scoreFromTranscript(
  transcript: Array<{ role: string; content: string }>,
  keyword: string
): number {
  if (!transcript.length) return 0;
  const text = transcript.map((m) => m.content || '').join(' ').toLowerCase();
  const hits = (text.match(new RegExp(keyword, 'gi')) || []).length;
  return Math.min(100, Math.round((hits / transcript.length) * 25));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, transcript } = body;

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const authHeaders: Record<string, string> = {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    };

    const interviewRes = await fetch(
      `${supabaseUrl}/rest/v1/interviews?token=eq.${token}&select=*`,
      { headers: authHeaders }
    );
    const interviews = await interviewRes.json();

    if (!interviews.length) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const interview = interviews[0];

    if (transcript !== undefined) {
      await fetch(`${supabaseUrl}/rest/v1/interviews?id=eq.${interview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          transcript,
          status: 'completed',
          completed_at: new Date().toISOString(),
        }),
      });
    }

    const t = Array.isArray(transcript) ? transcript : [];
    const dimensions = {
      digital_strategy: scoreFromTranscript(t, 'strategy'),
      data_management: scoreFromTranscript(t, 'data'),
      customer_experience: scoreFromTranscript(t, 'customer'),
      operations_automation: scoreFromTranscript(t, 'operations'),
      culture_skills: scoreFromTranscript(t, 'skills'),
      computed_at: new Date().toISOString(),
      transcript_length: t.length,
    };

    const reportRes = await fetch(`${supabaseUrl}/rest/v1/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        interview_id: interview.id,
        dimensions,
        pack_type: 'starter',
        credits_used: 1,
      }),
    });

    if (!reportRes.ok) {
      const err = await reportRes.text();
      console.error('[/api/report] Supabase error:', err);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    const [report] = await reportRes.json();

    return NextResponse.json({
      report_id: report.id,
      interview_id: interview.id,
      dimensions: report.dimensions,
    });
  } catch (err) {
    console.error('[/api/report] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
