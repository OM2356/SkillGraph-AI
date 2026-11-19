import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { mapUserSkillRow } from '@/lib/mappers';
import { skillCreateSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const q = searchParams.get('q')?.trim().toLowerCase();

  const { data, error } = await auth.supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let skills = (data || []).map(mapUserSkillRow);
  if (category && category !== 'All') {
    skills = skills.filter((s) => s.category === category);
  }
  if (q) {
    skills = skills.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ skills });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = skillCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const { data: existing } = await auth.supabase
      .from('user_skills')
      .select('id, name')
      .eq('user_id', auth.user.id);

    const duplicate = (existing || []).find(
      (row) => String(row.name).trim().toLowerCase() === v.name.toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        { error: `Skill "${v.name}" is already in your inventory. Update it instead.` },
        { status: 409 }
      );
    }

    const { data, error } = await auth.supabase
      .from('user_skills')
      .insert({
        user_id: auth.user.id,
        name: v.name,
        category: v.category,
        proficiency: v.proficiency,
        experience_months: v.experienceMonths,
        last_practiced: v.lastPracticed,
        confidence: v.confidence ?? v.proficiency,
        evidence: v.evidence,
        currently_learning: v.currentlyLearning,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ skill: mapUserSkillRow(data) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}
