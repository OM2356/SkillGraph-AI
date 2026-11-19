import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { getCatalogRoleById } from '@/lib/catalog';
import {
  mapAnalysisItemRow,
  mapAnalysisRow,
  mapProfileRow,
  mapProjectRow,
  mapUserSkillRow,
} from '@/lib/mappers';
import { analysisRequestSchema } from '@/lib/validations';
import { calculateSkillGapAnalysis } from '@/shared/scoringEngine';
import { generateGapAnalysisNarrative } from '@/lib/ai/gemini';
import { checkRateLimit } from '@/lib/rateLimit';
import { isGeminiConfigured } from '@/lib/supabase/config';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const [{ data: analysesData, error: analysesErr }, { data: itemsData, error: itemsErr }] =
    await Promise.all([
      auth.supabase
        .from('analyses')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      auth.supabase
        .from('analysis_items')
        .select('*')
        .eq('user_id', auth.user.id),
    ]);

  if (analysesErr || itemsErr) {
    return NextResponse.json(
      { error: analysesErr?.message || itemsErr?.message || 'Failed to load analyses' },
      { status: 500 }
    );
  }

  const itemsByAnalysis = new Map<string, Record<string, unknown>[]>();
  for (const item of itemsData || []) {
    const aid = String(item.analysis_id);
    const list = itemsByAnalysis.get(aid) || [];
    list.push(item);
    itemsByAnalysis.set(aid, list);
  }

  const analyses = (analysesData || []).map((row) =>
    mapAnalysisRow(row, itemsByAnalysis.get(String(row.id)) || [])
  );

  return NextResponse.json({ analyses });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const limit = checkRateLimit(`analysis:${auth.user.id}`, 8, 60_000);
  if (!limit.allowed) return limit.response;

  try {
    const body = await request.json();
    const parsed = analysisRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const role = await getCatalogRoleById(parsed.data.targetRoleId);
    if (!role) {
      return NextResponse.json({ error: 'Selected target career role was not found.' }, { status: 404 });
    }

    const [profRes, skillsRes, projRes] = await Promise.all([
      auth.supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle(),
      auth.supabase.from('user_skills').select('*').eq('user_id', auth.user.id),
      auth.supabase.from('projects').select('*').eq('user_id', auth.user.id),
    ]);

    const profile = profRes.data ? mapProfileRow(profRes.data) : { displayName: auth.user.email || 'Student', hoursPerWeek: 10 };
    const userSkills = (skillsRes.data || []).map(mapUserSkillRow);
    const userProjects = (projRes.data || []).map(mapProjectRow);

    const summary = calculateSkillGapAnalysis({
      role,
      userSkills,
      userProjects,
      hoursPerWeek: profile.hoursPerWeek || 10,
    });

    let aiReport = undefined;
    let aiWarning: string | undefined;
    let enrichedGapItems = summary.gapItems;

    if (parsed.data.includeAIReport) {
      if (!isGeminiConfigured()) {
        aiWarning =
          'GEMINI_API_KEY is not configured on the server. Deterministic scoring succeeded, and AI narrative guidance was skipped.';
      } else {
        try {
          const aiResult = await generateGapAnalysisNarrative({
            role,
            profile,
            userSkills,
            userProjects,
            readinessScore: summary.readinessScore,
            overallMatchPercentage: summary.overallMatchPercentage,
            estimatedHours: summary.estimatedHours,
            gapItems: summary.gapItems,
          });
          aiReport = aiResult.report;
          const enrichMap = new Map(
            aiResult.gapEnrichments.map((e) => [e.skillName.toLowerCase(), e])
          );
          enrichedGapItems = summary.gapItems.map((item) => {
            const match = enrichMap.get(item.skillName.toLowerCase());
            if (!match) return item;
            return {
              ...item,
              reasonMatters: match.reasonMatters,
              learningApproach: match.learningApproach,
              recommendedProject: match.recommendedProject,
              resourceSuggestion: match.resourceSuggestion,
            };
          });
        } catch (err) {
          aiWarning =
            err instanceof Error
              ? `AI report could not be generated (${err.message}). Deterministic skill gap scoring was saved.`
              : 'AI report generation failed. Deterministic scoring was saved.';
        }
      }
    }

    const { data: savedAnalysis, error: saveErr } = await auth.supabase
      .from('analyses')
      .insert({
        user_id: auth.user.id,
        target_role_id: summary.targetRoleId,
        target_role_name: summary.targetRoleName,
        readiness_score: summary.readinessScore,
        overall_match_percentage: summary.overallMatchPercentage,
        matched_count: summary.matchedCount,
        improve_count: summary.improveCount,
        missing_count: summary.missingCount,
        estimated_hours: summary.estimatedHours,
        estimated_weeks: summary.estimatedWeeksAtPace,
        methodology: summary.methodology,
        ai_report: aiReport ?? null,
      })
      .select()
      .single();

    if (saveErr || !savedAnalysis) {
      return NextResponse.json(
        { error: saveErr?.message || 'Failed to save analysis report.' },
        { status: 500 }
      );
    }

    const itemPayloads = enrichedGapItems.map((item) => ({
      analysis_id: savedAnalysis.id,
      user_id: auth.user.id,
      skill_name: item.skillName,
      category: item.category,
      tier: item.tier,
      current_proficiency: item.currentProficiency,
      target_proficiency: item.targetProficiency,
      importance_weight: item.importanceWeight,
      gap_score: item.gapScore,
      weighted_impact: item.weightedImpact,
      priority: item.priority,
      status: item.status,
      demonstrated_in_project: item.demonstratedInProject,
      estimated_hours: item.estimatedHours,
      reason_matters: item.reasonMatters || null,
      learning_approach: item.learningApproach || null,
      recommended_project: item.recommendedProject || null,
      resource_suggestion: item.resourceSuggestion || null,
    }));

    const { data: savedItems, error: itemsErr } = await auth.supabase
      .from('analysis_items')
      .insert(itemPayloads)
      .select();

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    // Also update profile target role & record readiness snapshot
    await Promise.all([
      auth.supabase
        .from('profiles')
        .update({ target_role_id: role.id, target_role_name: role.name, career_domain: role.domain })
        .eq('id', auth.user.id),
      auth.supabase.from('progress_records').insert({
        user_id: auth.user.id,
        record_date: new Date().toISOString().slice(0, 10),
        hours_studied: 0,
        tasks_completed: 0,
        skills_improved: summary.matchedCount,
        readiness_score: summary.readinessScore,
        note: `Skill gap analysis for ${role.name}`,
      }),
    ]);

    return NextResponse.json(
      {
        analysis: {
          ...mapAnalysisRow(savedAnalysis, savedItems || []),
          gapItems: (savedItems || []).map(mapAnalysisItemRow),
        },
        aiWarning,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid analysis request payload.' }, { status: 400 });
  }
}
