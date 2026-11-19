import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { mapProjectRow } from '@/lib/mappers';
import { projectCreateSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from('projects')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    projects: (data || []).map(mapProjectRow),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = projectCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const { data, error } = await auth.supabase
      .from('projects')
      .insert({
        user_id: auth.user.id,
        title: v.title,
        description: v.description,
        tech_stack: v.techStack,
        skills_demonstrated: v.skillsDemonstrated,
        github_url: v.githubUrl,
        live_url: v.liveUrl,
        status: v.status,
        user_role: v.userRole,
        achievements: v.achievements,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ project: mapProjectRow(data) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}
