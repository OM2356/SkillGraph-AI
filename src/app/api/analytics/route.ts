import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import {
  mapAnalysisRow,
  mapProgressRow,
  mapProjectRow,
  mapRoadmapTaskRow,
  mapUserSkillRow,
} from '@/lib/mappers';
import { progressLogSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const uid = auth.user.id;
  const [skillsRes, analysesRes, tasksRes, projectsRes, progressRes] = await Promise.all([
    auth.supabase.from('user_skills').select('*').eq('user_id', uid),
    auth.supabase
      .from('analyses')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true }),
    auth.supabase.from('roadmap_tasks').select('*').eq('user_id', uid),
    auth.supabase.from('projects').select('*').eq('user_id', uid),
    auth.supabase
      .from('progress_records')
      .select('*')
      .eq('user_id', uid)
      .order('record_date', { ascending: true }),
  ]);

  const skills = (skillsRes.data || []).map(mapUserSkillRow);
  const analyses = (analysesRes.data || []).map((row) => mapAnalysisRow(row, []));
  const tasks = (tasksRes.data || []).map(mapRoadmapTaskRow);
  const projects = (projectsRes.data || []).map(mapProjectRow);
  const progress = (progressRes.data || []).map(mapProgressRow);

  // Category distribution for skills
  const categoryMap = new Map<string, { category: string; count: number; avgProficiency: number; sum: number }>();
  for (const s of skills) {
    const cur = categoryMap.get(s.category) || { category: s.category, count: 0, avgProficiency: 0, sum: 0 };
    cur.count += 1;
    cur.sum += s.proficiency;
    cur.avgProficiency = Number((cur.sum / cur.count).toFixed(2));
    categoryMap.set(s.category, cur);
  }

  // Latest analysis items if available
  const latest = analyses[analyses.length - 1];
  let latestGapItems: ReturnType<typeof mapAnalysisRow>['gapItems'] = [];
  if (latest) {
    const { data: itemRows } = await auth.supabase
      .from('analysis_items')
      .select('*')
      .eq('analysis_id', latest.id)
      .eq('user_id', uid);
    latestGapItems = mapAnalysisRow(analysesRes.data![analysesRes.data!.length - 1], itemRows || []).gapItems;
  }

  return NextResponse.json({
    readinessTrend: analyses.map((a) => ({
      date: typeof a.createdAt === 'string' ? a.createdAt.slice(0, 10) : '',
      role: a.targetRoleName,
      readinessScore: a.readinessScore,
      matchPercentage: a.overallMatchPercentage,
    })),
    categoryBreakdown: Array.from(categoryMap.values()),
    taskStats: {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      notStarted: tasks.filter((t) => t.status === 'not_started').length,
    },
    projectStats: {
      total: projects.length,
      completed: projects.filter((p) => p.status === 'completed').length,
      inProgress: projects.filter((p) => p.status === 'in_progress').length,
      idea: projects.filter((p) => p.status === 'idea').length,
    },
    latestGapItems,
    progressHistory: progress,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = progressLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const { data, error } = await auth.supabase
      .from('progress_records')
      .insert({
        user_id: auth.user.id,
        record_date: v.recordDate || new Date().toISOString().slice(0, 10),
        hours_studied: v.hoursStudied,
        tasks_completed: v.tasksCompleted,
        skills_improved: v.skillsImproved,
        note: v.note,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ record: mapProgressRow(data) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}
