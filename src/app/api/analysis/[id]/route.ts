import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { mapAnalysisRow } from '@/lib/mappers';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const [{ data: analysis, error: analysisErr }, { data: items, error: itemsErr }] =
    await Promise.all([
      auth.supabase
        .from('analyses')
        .select('*')
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .maybeSingle(),
      auth.supabase
        .from('analysis_items')
        .select('*')
        .eq('analysis_id', id)
        .eq('user_id', auth.user.id),
    ]);

  if (analysisErr || itemsErr) {
    return NextResponse.json(
      { error: analysisErr?.message || itemsErr?.message || 'Database error' },
      { status: 500 }
    );
  }
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis report not found.' }, { status: 404 });
  }

  return NextResponse.json({ analysis: mapAnalysisRow(analysis, items || []) });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { error, count } = await auth.supabase
    .from('analyses')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!count) {
    return NextResponse.json({ error: 'Analysis report not found.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id });
}
