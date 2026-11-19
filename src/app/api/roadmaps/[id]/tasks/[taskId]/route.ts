import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { mapRoadmapTaskRow } from '@/lib/mappers';
import { roadmapTaskPatchSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id: roadmapId, taskId } = await context.params;

  try {
    const body = await request.json();
    const parsed = roadmapTaskPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing } = await auth.supabase
      .from('roadmap_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('roadmap_id', roadmapId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    const v = parsed.data;
    const updates: Record<string, unknown> = {};
    if (v.title !== undefined) updates.title = v.title;
    if (v.description !== undefined) updates.description = v.description;
    if (v.skillName !== undefined) updates.skill_name = v.skillName;
    if (v.priority !== undefined) updates.priority = v.priority;
    if (v.estimatedHours !== undefined) updates.estimated_hours = v.estimatedHours;
    if (v.dueDate !== undefined) updates.due_date = v.dueDate;
    if (v.learningResource !== undefined) updates.learning_resource = v.learningResource;
    if (v.assignment !== undefined) updates.assignment = v.assignment;
    if (v.status !== undefined) updates.status = v.status;
    if (v.orderIndex !== undefined) updates.order_index = v.orderIndex;

    const { data, error } = await auth.supabase
      .from('roadmap_tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('roadmap_id', roadmapId)
      .eq('user_id', auth.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Record progress when a task transitions to completed
    if (v.status === 'completed' && existing.status !== 'completed') {
      const hours = Number(data.estimated_hours || 1);
      await auth.supabase.from('progress_records').insert({
        user_id: auth.user.id,
        record_date: new Date().toISOString().slice(0, 10),
        hours_studied: hours,
        tasks_completed: 1,
        skills_improved: 0,
        note: `Completed: ${data.title}`,
      });
    }

    return NextResponse.json({ task: mapRoadmapTaskRow(data) });
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id: roadmapId, taskId } = await context.params;
  const { error, count } = await auth.supabase
    .from('roadmap_tasks')
    .delete({ count: 'exact' })
    .eq('id', taskId)
    .eq('roadmap_id', roadmapId)
    .eq('user_id', auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!count) {
    return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id: taskId });
}
