import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DIMENSIONS = ['Strategy', 'Operations', 'People', 'Technology', 'Data'];

function scoreFromAnswer(answer: string): number {
  if (!answer || answer.trim().length < 10) return 10;
  if (answer.trim().length < 50) return 30;
  if (answer.trim().length < 120) return 55;
  if (answer.trim().length < 250) return 75;
  return 90;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const { leadId } = params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interviews?lead_id=eq.${leadId}&select=id,status,transcript`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const allInterviews: { id: string; status: string; transcript: any[] | null }[] = await res.json();

  const totalCount = allInterviews.length;
  const complete = allInterviews.filter((i) => i.status === 'complete');
  const completedCount = complete.length;

  if (completedCount === 0) {
    return NextResponse.json({
      leadId,
      completedCount: 0,
      totalCount,
      dimensions: [],
      partial: totalCount > 0,
    });
  }

  const dimensionTotals = DIMENSIONS.map(() => ({ sum: 0, count: 0 }));

  for (const interview of complete) {
    const answers: string[] = Array.isArray(interview.transcript) ? interview.transcript : [];
    answers.forEach((ans, idx) => {
      if (idx < DIMENSIONS.length) {
        dimensionTotals[idx].sum += scoreFromAnswer(ans);
        dimensionTotals[idx].count += 1;
      }
    });
  }

  const dimensions = DIMENSIONS.map((name, i) => ({
    name,
    score: dimensionTotals[i].count > 0
      ? Math.round(dimensionTotals[i].sum / dimensionTotals[i].count)
      : 0,
  }));

  return NextResponse.json({
    leadId,
    completedCount,
    totalCount,
    dimensions,
    partial: completedCount < totalCount,
  });
}
