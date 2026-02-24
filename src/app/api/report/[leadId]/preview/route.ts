import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DIMENSIONS = ['Strategy', 'Operations', 'People', 'Technology', 'Data'];

function scoreFromAnswer(answer: string): number {
  // Crude but functional: score by word count / sentiment length as proxy (0-5)
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

  // Get all interviews for this lead
  const { data: allInterviews, error: allErr } = await supabase
    .from('interviews')
    .select('id, status, answers')
    .eq('lead_id', leadId);

  if (allErr) return NextResponse.json({ error: allErr.message }, { status: 500 });

  const totalCount = allInterviews?.length ?? 0;
  const complete = (allInterviews ?? []).filter((i) => i.status === 'complete');
  const completedCount = complete.length;

  // Aggregate scores per dimension across completed interviews
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
