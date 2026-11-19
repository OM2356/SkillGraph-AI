import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { getCatalogRoleById } from '@/lib/catalog';
import {
  mapProjectRow,
  mapRoadmapRow,
  mapRoadmapTaskRow,
  mapUserSkillRow,
} from '@/lib/mappers';
import { roadmapCreateSchema } from '@/lib/validations';
import { calculateSkillGapAnalysis } from '@/shared/scoringEngine';
import { generatePersonalizedRoadmapAI } from '@/lib/ai/gemini';
import { checkRateLimit } from '@/lib/rateLimit';
import { isGeminiConfigured } from '@/lib/supabase/config';
import type { GapItemResult, RoadmapPhase } from '@/shared/types';

export const runtime = 'nodejs';

function buildDeterministicRoadmapFallback(params: {
  roleName: string;
  durationDays: number;
  hoursPerWeek: number;
  gapItems: GapItemResult[];
}) {
  const phaseNames = [
    'Foundation',
    'Core Skills',
    'Advanced Skills',
    'Projects & Portfolio',
    'Interview & Job Preparation',
  ];
  const step = Math.max(1, Math.floor(params.durationDays / 5));

  const phases: RoadmapPhase[] = phaseNames.map((name, i) => ({
    phaseIndex: i + 1,
    name,
    goal: `Build structured proficiency in ${name.toLowerCase()} for ${params.roleName}.`,
    weekRange: `Days ${i * step + 1}–${i === 4 ? params.durationDays : (i + 1) * step}`,
  }));

  const gaps = params.gapItems.filter((g) => g.gapScore > 0);
  const targetGaps = gaps.length > 0 ? gaps : params.gapItems;

  const tasks = targetGaps.slice(0, 14).map((g, idx) => {
    const phaseIndex = Math.min(5, Math.floor((idx / Math.max(targetGaps.slice(0, 14).length, 1)) * 4) + 1);
    const startOffset = Math.min(params.durationDays - 2, Math.floor((idx / 14) * params.durationDays));
    const endOffset = Math.min(params.durationDays, startOffset + Math.max(2, Math.floor(params.durationDays / 10)));

    return {
      phaseIndex,
      phaseName: phaseNames[phaseIndex - 1],
      title: `Strengthen ${g.skillName} (Level ${g.currentProficiency} → ${g.targetProficiency})`,
      description: `Focus on closing your ${g.skillName} gap (${g.tier} requirement, weight ${g.importanceWeight}/10) with structured exercises.`,
      skillName: g.skillName,
      priority: g.priority === 'met' ? ('low' as const) : g.priority,
      estimatedHours: Math.max(2, Math.min(20, g.estimatedHours || 4)),
      dayOffsetStart: startOffset,
      dayOffsetEnd: endOffset,
      learningResource: 'Official documentation & structured hands-on exercises',
      assignment: `Implement and document a verifiable ${g.skillName} practice module in Git.`,
    };
  });

  tasks.push({
    phaseIndex: 5,
    phaseName: 'Interview & Job Preparation',
    title: `Mock Technical Review & Portfolio Audit for ${params.roleName}`,
    description: `Review core ${params.roleName} architecture concepts, walk through portfolio repositories, and rehearse problem-solving explanations.`,
    skillName: 'Technical Communication',
    priority: 'high',
    estimatedHours: 4,
    dayOffsetStart: Math.max(0, params.durationDays - 4),
    dayOffsetEnd: params.durationDays,
    learningResource: 'Portfolio README & System Walkthrough Checklist',
    assignment: 'Record a 5-minute architecture walkthrough for your strongest project.',
  });

  return {
    title: `${params.durationDays}-Day ${params.roleName} Study Plan`,
    phases,
    tasks,
  };
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const [{ data: roadmapsData, error: rErr }, { data: tasksData, error: tErr }] =
    await Promise.all([
      auth.supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false }),
      auth.supabase
        .from('roadmap_tasks')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('order_index', { ascending: true }),
    ]);

  if (rErr || tErr) {
    return NextResponse.json({ error: rErr?.message || tErr?.message }, { status: 500 });
  }

  const tasksByRoadmap = new Map<string, ReturnType<typeof mapRoadmapTaskRow>[]>();
  for (const row of tasksData || []) {
    const rid = String(row.roadmap_id);
    const list = tasksByRoadmap.get(rid) || [];
    list.push(mapRoadmapTaskRow(row));
    tasksByRoadmap.set(rid, list);
  }

  const roadmaps = (roadmapsData || []).map((row) => {
    const r = mapRoadmapRow(row);
    const tasks = tasksByRoadmap.get(r.id) || [];
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const progressPct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return {
      ...r,
      tasks,
      progressPercentage: progressPct,
      completedCount: completed,
      totalTasks: tasks.length,
    };
  });

  return NextResponse.json({ roadmaps });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const limit = checkRateLimit(`roadmap:${auth.user.id}`, 6, 60_000);
  if (!limit.allowed) return limit.response;

  try {
    const body = await request.json();
    const parsed = roadmapCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const role = await getCatalogRoleById(v.targetRoleId);
    if (!role) {
      return NextResponse.json({ error: 'Selected target career role was not found.' }, { status: 404 });
    }

    const [skillsRes, projRes] = await Promise.all([
      auth.supabase.from('user_skills').select('*').eq('user_id', auth.user.id),
      auth.supabase.from('projects').select('*').eq('user_id', auth.user.id),
    ]);

    const userSkills = (skillsRes.data || []).map(mapUserSkillRow);
    const userProjects = (projRes.data || []).map(mapProjectRow);

    const summary = calculateSkillGapAnalysis({
      role,
      userSkills,
      userProjects,
      hoursPerWeek: v.hoursPerWeek,
    });

    let generated;
    let aiWarning: string | undefined;

    if (isGeminiConfigured()) {
      try {
        generated = await generatePersonalizedRoadmapAI({
          role,
          durationDays: v.durationDays,
          hoursPerWeek: v.hoursPerWeek,
          learningStyle: v.learningStyle,
          budgetPreference: v.budgetPreference,
          gapItems: summary.gapItems,
          existingSkills: userSkills,
        });
      } catch (err) {
        aiWarning =
          err instanceof Error
            ? `Gemini roadmap generator failed (${err.message}). Built structured roadmap from deterministic gap weights.`
            : 'Built structured roadmap from deterministic gap weights.';
        generated = buildDeterministicRoadmapFallback({
          roleName: role.name,
          durationDays: v.durationDays,
          hoursPerWeek: v.hoursPerWeek,
          gapItems: summary.gapItems,
        });
      }
    } else {
      aiWarning = 'GEMINI_API_KEY is not configured. Generated roadmap from deterministic gap weights.';
      generated = buildDeterministicRoadmapFallback({
        roleName: role.name,
        durationDays: v.durationDays,
        hoursPerWeek: v.hoursPerWeek,
        gapItems: summary.gapItems,
      });
    }

    const { data: savedRoadmap, error: rErr } = await auth.supabase
      .from('roadmaps')
      .insert({
        user_id: auth.user.id,
        title: generated.title,
        target_role_id: role.id,
        target_role_name: role.name,
        duration_days: v.durationDays,
        hours_per_week: v.hoursPerWeek,
        status: 'active',
        phases: generated.phases,
      })
      .select()
      .single();

    if (rErr || !savedRoadmap) {
      return NextResponse.json(
        { error: rErr?.message || 'Failed to save roadmap.' },
        { status: 500 }
      );
    }

    const taskPayloads = generated.tasks.map((t, index) => ({
      roadmap_id: savedRoadmap.id,
      user_id: auth.user.id,
      phase_index: t.phaseIndex,
      phase_name: t.phaseName,
      title: t.title,
      description: t.description,
      skill_name: t.skillName,
      priority: t.priority,
      estimated_hours: t.estimatedHours,
      start_date: addDaysIso(t.dayOffsetStart),
      due_date: addDaysIso(t.dayOffsetEnd),
      learning_resource: t.learningResource,
      assignment: t.assignment,
      status: 'not_started',
      order_index: index,
    }));

    const { data: savedTasks, error: tErr } = await auth.supabase
      .from('roadmap_tasks')
      .insert(taskPayloads)
      .select();

    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }

    const tasks = (savedTasks || []).map(mapRoadmapTaskRow);
    return NextResponse.json(
      {
        roadmap: {
          ...mapRoadmapRow(savedRoadmap),
          tasks,
          progressPercentage: 0,
          completedCount: 0,
          totalTasks: tasks.length,
        },
        aiWarning,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid roadmap request payload.' }, { status: 400 });
  }
}
