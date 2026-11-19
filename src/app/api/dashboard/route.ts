import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import {
  mapAnalysisRow,
  mapProfileRow,
  mapProgressRow,
  mapProjectRow,
  mapRoadmapRow,
  mapRoadmapTaskRow,
  mapUserSkillRow,
} from '@/lib/mappers';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const uid = auth.user.id;
  const [profRes, skillsRes, analysesRes, roadmapsRes, tasksRes, projectsRes, progressRes] =
    await Promise.all([
      auth.supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      auth.supabase.from('user_skills').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      auth.supabase
        .from('analyses')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(5),
      auth.supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(5),
      auth.supabase
        .from('roadmap_tasks')
        .select('*')
        .eq('user_id', uid)
        .order('order_index', { ascending: true }),
      auth.supabase.from('projects').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      auth.supabase
        .from('progress_records')
        .select('*')
        .eq('user_id', uid)
        .order('record_date', { ascending: true })
        .limit(60),
    ]);

  const profile = profRes.data
    ? mapProfileRow(profRes.data)
    : {
        uid,
        email: auth.user.email || '',
        displayName: auth.user.email?.split('@')[0] || 'Student',
        role: 'user' as const,
        onboardingCompleted: false,
        hoursPerWeek: 10,
      };

  const skills = (skillsRes.data || []).map(mapUserSkillRow);
  const projects = (projectsRes.data || []).map(mapProjectRow);
  const progress = (progressRes.data || []).map(mapProgressRow);

  const latestAnalysisRow = analysesRes.data?.[0];
  let latestAnalysis = null;
  if (latestAnalysisRow) {
    const { data: itemsData } = await auth.supabase
      .from('analysis_items')
      .select('*')
      .eq('analysis_id', latestAnalysisRow.id)
      .eq('user_id', uid);
    latestAnalysis = mapAnalysisRow(latestAnalysisRow, itemsData || []);
  }

  const allTasks = (tasksRes.data || []).map(mapRoadmapTaskRow);
  const roadmaps = (roadmapsRes.data || []).map((r) => {
    const mapped = mapRoadmapRow(r);
    const tasks = allTasks.filter((t) => t.roadmapId === mapped.id);
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return {
      ...mapped,
      tasks,
      completedCount: completed,
      totalTasks: tasks.length,
      progressPercentage: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    };
  });

  const activeRoadmap = roadmaps.find((r) => r.status === 'active') || roadmaps[0] || null;
  const totalHoursStudied = progress.reduce((acc, p) => acc + p.hoursStudied, 0);
  const totalTasksCompleted = allTasks.filter((t) => t.status === 'completed').length;

  return NextResponse.json({
    profile,
    stats: {
      skillCount: skills.length,
      projectCount: projects.length,
      completedProjects: projects.filter((p) => p.status === 'completed').length,
      readinessScore: latestAnalysis?.readinessScore ?? null,
      matchedSkillsCount: latestAnalysis?.matchedCount ?? 0,
      missingSkillsCount: latestAnalysis ? latestAnalysis.missingCount + latestAnalysis.improveCount : 0,
      activeRoadmapProgress: activeRoadmap?.progressPercentage ?? 0,
      totalTasksCompleted,
      totalHoursStudied: Number(totalHoursStudied.toFixed(1)),
    },
    latestAnalysis,
    activeRoadmap,
    recentProjects: projects.slice(0, 4),
    recentProgress: progress.slice(-10),
    skills: skills.slice(0, 12),
  });
}
