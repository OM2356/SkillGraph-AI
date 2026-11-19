import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { mapRoadmapTaskRow } from '@/lib/mappers';
import { roadmapTaskCreateSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id: roadmapId } = await context.params;

  // Verify roadmap ownership
  const { data: roadmap } = await auth.supabase
    .from('roadmaps')
    .select('id')
    .eq('id', roadmapId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (!roadmap) {
    return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = roadmapTaskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existingTasks } = await auth.supabase
      .from('roadmap_tasks')
      .select('order_index')
      .eq('roadmap_id', roadmapId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = existingTasks && existingTasks.length > 0 ? Number(existingTasks[0].order_index) + 1 : 0;
    const v = parsed.data;

    const { data, error } = await auth.supabase
      .from('roadmap_tasks')
      .insert({
        roadmap_id: roadmapId,
        user_id: auth.user.id,
        phase_index: v.phaseIndex,
        phase_name: v.phaseName,
        title: v.title,
        description: v.description,
        skill_name: v.skillName,
        priority: v.priority,
        estimated_hours: v.estimatedHours,
        start_date: v.startDate || new Date().toISOString().slice(0, 10),
        due_date: v.dueDate || new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
        learning_resource: v.learningResource,
        assignment: v.assignment,
        status: 'not_started',
        order_index: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ task: mapRoadmapTaskRow(data) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}
