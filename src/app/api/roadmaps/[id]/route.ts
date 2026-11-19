import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { mapRoadmapRow, mapRoadmapTaskRow } from '@/lib/mappers';
import { roadmapPatchSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const [{ data: roadmap, error: rErr }, { data: tasks, error: tErr }] = await Promise.all([
    auth.supabase
      .from('roadmaps')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .maybeSingle(),
    auth.supabase
      .from('roadmap_tasks')
      .select('*')
      .eq('roadmap_id', id)
      .eq('user_id', auth.user.id)
      .order('order_index', { ascending: true }),
  ]);

  if (rErr || tErr) {
    return NextResponse.json({ error: rErr?.message || tErr?.message }, { status: 500 });
  }
  if (!roadmap) {
    return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
  }

  const mappedTasks = (tasks || []).map(mapRoadmapTaskRow);
  const completed = mappedTasks.filter((t) => t.status === 'completed').length;
  const progressPercentage =
    mappedTasks.length > 0 ? Math.round((completed / mappedTasks.length) * 100) : 0;

  return NextResponse.json({
    roadmap: {
      ...mapRoadmapRow(roadmap),
      tasks: mappedTasks,
      progressPercentage,
      completedCount: completed,
      totalTasks: mappedTasks.length,
    },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = roadmapPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;

    const { data, error } = await auth.supabase
      .from('roadmaps')
      .update(updates)
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
    }

    return NextResponse.json({ roadmap: mapRoadmapRow(data) });
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { error, count } = await auth.supabase
    .from('roadmaps')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!count) {
    return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id });
}
