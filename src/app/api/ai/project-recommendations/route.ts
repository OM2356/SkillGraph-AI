import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { getCatalogRoleById } from '@/lib/catalog';
import { mapProjectRow, mapUserSkillRow } from '@/lib/mappers';
import { projectRecommendationsSchema } from '@/lib/validations';
import { calculateSkillGapAnalysis } from '@/shared/scoringEngine';
import { PROJECT_TEMPLATES } from '@/shared/catalogData';
import { generateProjectRecommendationsAI } from '@/lib/ai/gemini';
import { checkRateLimit } from '@/lib/rateLimit';
import { isGeminiConfigured } from '@/lib/supabase/config';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const limit = checkRateLimit(`projrec:${auth.user.id}`, 8, 60_000);
  if (!limit.allowed) return limit.response;

  try {
    const body = await request.json();
    const parsed = projectRecommendationsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [profRes, skillsRes, projRes, roadmapRes] = await Promise.all([
      auth.supabase.from('profiles').select('target_role_id').eq('id', auth.user.id).maybeSingle(),
      auth.supabase.from('user_skills').select('*').eq('user_id', auth.user.id),
      auth.supabase.from('projects').select('*').eq('user_id', auth.user.id),
      auth.supabase
        .from('roadmaps')
        .select('title')
        .eq('user_id', auth.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const roleId = parsed.data.targetRoleId || String(profRes.data?.target_role_id || 'full-stack-developer');
    const role = await getCatalogRoleById(roleId);
    if (!role) {
      return NextResponse.json({ error: 'Career role not found.' }, { status: 404 });
    }

    const userSkills = (skillsRes.data || []).map(mapUserSkillRow);
    const userProjects = (projRes.data || []).map(mapProjectRow);
    const summary = calculateSkillGapAnalysis({ role, userSkills, userProjects });

    const missingSkills = summary.gapItems
      .filter((g) => g.status === 'missing')
      .map((g) => g.skillName)
      .slice(0, 6);
    const improveSkills = summary.gapItems
      .filter((g) => g.status === 'needs_improvement')
      .map((g) => g.skillName)
      .slice(0, 5);

    const curatedTemplates = PROJECT_TEMPLATES.filter((t) => t.roleIds.includes(role.id));

    if (!parsed.data.useAI || !isGeminiConfigured()) {
      return NextResponse.json({
        recommendations: curatedTemplates.length > 0 ? curatedTemplates : PROJECT_TEMPLATES.slice(0, 3),
        source: 'curated',
        warning: !isGeminiConfigured()
          ? 'GEMINI_API_KEY is not configured. Showing curated blueprint templates matching your target role.'
          : undefined,
      });
    }

    try {
      const recommendations = await generateProjectRecommendationsAI({
        role,
        missingSkills,
        skillsToImprove: improveSkills,
        existingSkills: userSkills.map((s) => s.name),
        existingProjects: userProjects.map((p) => p.title),
        roadmapFocus: roadmapRes.data?.title || undefined,
      });
      return NextResponse.json({ recommendations, source: 'ai' });
    } catch (err) {
      return NextResponse.json({
        recommendations: curatedTemplates.length > 0 ? curatedTemplates : PROJECT_TEMPLATES.slice(0, 3),
        source: 'curated',
        warning:
          err instanceof Error
            ? `AI project generation unavailable (${err.message}). Showing curated role templates.`
            : 'Showing curated role templates.',
      });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}
