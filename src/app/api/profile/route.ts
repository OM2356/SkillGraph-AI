import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { mapProfileRow } from '@/lib/mappers';
import { profileUpdateSchema } from '@/lib/validations';
import { getCatalogRoleById } from '@/lib/catalog';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    const initial = {
      id: user.id,
      email: user.email || '',
      display_name:
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.display_name as string) ||
        user.email?.split('@')[0] ||
        'Student',
    };
    const { data: created, error: createErr } = await supabase
      .from('profiles')
      .upsert(initial)
      .select()
      .single();

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
    return NextResponse.json({ profile: mapProfileRow(created) });
  }

  return NextResponse.json({ profile: mapProfileRow(data) });
}

export async function PUT(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const updates: Record<string, unknown> = {
      id: auth.user.id,
      email: auth.user.email || '',
    };

    if (v.displayName !== undefined) updates.display_name = v.displayName;
    if (v.college !== undefined) updates.college = v.college;
    if (v.degree !== undefined) updates.degree = v.degree;
    if (v.currentYear !== undefined) updates.current_year = v.currentYear;
    if (v.graduationYear !== undefined) updates.graduation_year = v.graduationYear;
    if (v.country !== undefined) updates.country = v.country;
    if (v.targetRoleId !== undefined) {
      updates.target_role_id = v.targetRoleId;
      const role = await getCatalogRoleById(v.targetRoleId);
      if (role) {
        updates.target_role_name = role.name;
        updates.career_domain = role.domain;
      }
    }
    if (v.targetRoleName !== undefined && !updates.target_role_name) {
      updates.target_role_name = v.targetRoleName;
    }
    if (v.careerDomain !== undefined && !updates.career_domain) {
      updates.career_domain = v.careerDomain;
    }
    if (v.targetCompanies !== undefined) updates.target_companies = v.targetCompanies;
    if (v.desiredIndustry !== undefined) updates.desired_industry = v.desiredIndustry;
    if (v.jobGoal !== undefined) updates.job_goal = v.jobGoal;
    if (v.hoursPerWeek !== undefined) updates.hours_per_week = v.hoursPerWeek;
    if (v.learningStyle !== undefined) updates.learning_style = v.learningStyle;
    if (v.budgetPreference !== undefined) updates.budget_preference = v.budgetPreference;
    if (v.preferredLanguage !== undefined) updates.preferred_language = v.preferredLanguage;
    if (v.learningPace !== undefined) updates.learning_pace = v.learningPace;
    if (v.onboardingCompleted !== undefined) updates.onboarding_completed = v.onboardingCompleted;
    if (v.portfolioPublic !== undefined) updates.portfolio_public = v.portfolioPublic;
    if (v.portfolioSlug !== undefined) updates.portfolio_slug = v.portfolioSlug || null;

    const { data, error } = await auth.supabase
      .from('profiles')
      .upsert(updates)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile: mapProfileRow(data) });
  } catch {
    return NextResponse.json({ error: 'Invalid profile update payload.' }, { status: 400 });
  }
}
