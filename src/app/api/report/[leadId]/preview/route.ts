import { NextRequest, NextResponse } from 'next/server';

const DIMENSIONS = ['Strategy', 'Operations', 'People', 'Technology', 'Data'];

function scoreFromAnswer(answer: string): number {
  if (!answer || answer.trim().length < 10) return 1;
  if (answer.trim().length < 50) return 2;
  if (answer.trim().length < 120) return 3;
  if (answer.trim().length < 250) return 4;
  return 5;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const { leadId } = params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interviews?lead_id=eq.${leadId}&select=id,status,answers`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const allInterviews: { id: string; status: string; answers: string[] | null }[] = await res.json();

  const totalCount = allInterviews.length;
  const complete = allInterviews.filter((i) => i.status === 'complete');
  const completedCount = complete.length;

  const dimensionTotals = DIMENSIONS.map(() => ({ sum: 0, count: 0 }));

  for (const interview of complete) {
    const answers: string[] = Array.isArray(interview.answers) ? interview.answers : [];
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
      ? Math.round((dimensionTotals[i].sum / dimensionTotals[i].count) * 10) / 10
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
