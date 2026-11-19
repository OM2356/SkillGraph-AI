import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { mapProjectRow } from '@/lib/mappers';
import { projectUpdateSchema } from '@/lib/validations';

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
    const parsed = projectUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const updates: Record<string, unknown> = {};
    if (v.title !== undefined) updates.title = v.title;
    if (v.description !== undefined) updates.description = v.description;
    if (v.techStack !== undefined) updates.tech_stack = v.techStack;
    if (v.skillsDemonstrated !== undefined) updates.skills_demonstrated = v.skillsDemonstrated;
    if (v.githubUrl !== undefined) updates.github_url = v.githubUrl;
    if (v.liveUrl !== undefined) updates.live_url = v.liveUrl;
    if (v.status !== undefined) updates.status = v.status;
    if (v.userRole !== undefined) updates.user_role = v.userRole;
    if (v.achievements !== undefined) updates.achievements = v.achievements;

    const { data, error } = await auth.supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    return NextResponse.json({ project: mapProjectRow(data) });
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
    .from('projects')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!count) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id });
}
