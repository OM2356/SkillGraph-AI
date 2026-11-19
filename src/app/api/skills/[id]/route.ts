import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { mapUserSkillRow } from '@/lib/mappers';
import { skillUpdateSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = skillUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const updates: Record<string, unknown> = {};
    if (v.name !== undefined) updates.name = v.name;
    if (v.category !== undefined) updates.category = v.category;
    if (v.proficiency !== undefined) updates.proficiency = v.proficiency;
    if (v.experienceMonths !== undefined) updates.experience_months = v.experienceMonths;
    if (v.lastPracticed !== undefined) updates.last_practiced = v.lastPracticed;
    if (v.confidence !== undefined) updates.confidence = v.confidence;
    if (v.evidence !== undefined) updates.evidence = v.evidence;
    if (v.currentlyLearning !== undefined) updates.currently_learning = v.currentlyLearning;

    const { data, error } = await auth.supabase
      .from('user_skills')
      .update(updates)
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Skill not found.' }, { status: 404 });
    }

    return NextResponse.json({ skill: mapUserSkillRow(data) });
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
    .from('user_skills')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!count) {
    return NextResponse.json({ error: 'Skill not found.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id });
}
