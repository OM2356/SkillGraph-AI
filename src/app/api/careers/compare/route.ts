import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCatalogRoleById } from '@/lib/catalog';
import { calculateSkillGapAnalysis } from '@/shared/scoringEngine';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { mapProjectRow, mapUserSkillRow } from '@/lib/mappers';
import type { UserProject, UserSkill } from '@/shared/types';

export const runtime = 'nodejs';

const compareSchema = z.object({
  roleAId: z.string().trim().min(1),
  roleBId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = compareSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please select two career roles to compare.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [roleA, roleB] = await Promise.all([
      getCatalogRoleById(parsed.data.roleAId),
      getCatalogRoleById(parsed.data.roleBId),
    ]);

    if (!roleA || !roleB) {
      return NextResponse.json({ error: 'One or both selected career roles were not found.' }, { status: 404 });
    }

    let userSkills: UserSkill[] = [];
    let userProjects: UserProject[] = [];
    let hoursPerWeek = 10;

    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const [skillsRes, projRes, profRes] = await Promise.all([
          supabase.from('user_skills').select('*').eq('user_id', user.id),
          supabase.from('projects').select('*').eq('user_id', user.id),
          supabase.from('profiles').select('hours_per_week').eq('id', user.id).maybeSingle(),
        ]);
        userSkills = (skillsRes.data || []).map(mapUserSkillRow);
        userProjects = (projRes.data || []).map(mapProjectRow);
        hoursPerWeek = Number(profRes.data?.hours_per_week || 10);
      }
    }

    const analysisA = calculateSkillGapAnalysis({
      role: roleA,
      userSkills,
      userProjects,
      hoursPerWeek,
    });
    const analysisB = calculateSkillGapAnalysis({
      role: roleB,
      userSkills,
      userProjects,
      hoursPerWeek,
    });

    const skillsA = new Set(
      [...roleA.requiredSkills, ...roleA.importantSkills, ...roleA.optionalSkills].map((s) =>
        s.name.toLowerCase()
      )
    );
    const sharedSkills = [
      ...roleB.requiredSkills,
      ...roleB.importantSkills,
      ...roleB.optionalSkills,
    ]
      .filter((s) => skillsA.has(s.name.toLowerCase()))
      .map((s) => s.name);

    return NextResponse.json({
      roleA,
      roleB,
      comparisonA: analysisA,
      comparisonB: analysisB,
      sharedSkills,
      personalized: userSkills.length > 0,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
}
