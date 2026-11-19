import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  FolderGit2,
  Layers,
  Map as MapIcon,
  Target,
  UserCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip } from '../components/ChartTooltip';
import { useApp } from '../contexts/AuthContext';
import type { AppRoute } from '../layouts/AppShell';
import { subscribeRoadmapTasks } from '../services/firestoreService';
import { calculateSkillGapAnalysis } from '../shared/scoringEngine';
import type { RoadmapTask } from '../shared/types';

interface DashboardPageProps {
  onNavigate: (route: AppRoute) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, profile, skills, projects, analyses, roadmaps, careerRoles, progressRecords } = useApp();
  const [activeTasks, setActiveTasks] = useState<RoadmapTask[]>([]);

  const activeRoadmap = useMemo(
    () => roadmaps.find((r) => r.status === 'active') || roadmaps[0] || null,
    [roadmaps]
  );

  useEffect(() => {
    if (!user || !activeRoadmap) {
      setActiveTasks([]);
      return;
    }
    return subscribeRoadmapTasks(user.uid, activeRoadmap.id, setActiveTasks);
  }, [user, activeRoadmap]);

  const targetRole = useMemo(
    () => careerRoles.find((r) => r.id === profile?.targetRoleId) || careerRoles[0],
    [careerRoles, profile?.targetRoleId]
  );

  // Live deterministic calculation reflecting current skills
  const liveScore = useMemo(() => {
    if (!targetRole) return null;
    return calculateSkillGapAnalysis({
      role: targetRole,
      userSkills: skills,
      userProjects: projects,
      hoursPerWeek: profile?.hoursPerWeek || 10,
    });
  }, [targetRole, skills, projects, profile?.hoursPerWeek]);

  const latestAnalysis = analyses[0] || null;
  const readinessScore = liveScore?.readinessScore ?? latestAnalysis?.readinessScore ?? 0;
  const skillMatchPct = liveScore?.overallMatchPercentage ?? latestAnalysis?.overallMatchPercentage ?? 0;

  const completedTasks = activeTasks.filter((t) => t.status === 'completed').length;
  const roadmapProgressPct =
    activeTasks.length > 0 ? Math.round((completedTasks / activeTasks.length) * 100) : 0;
  const nextTask = activeTasks.find((t) => t.status === 'in_progress') || activeTasks.find((t) => t.status === 'not_started') || null;
  const upcomingDeadlines = activeTasks
    .filter((t) => t.status !== 'completed' && t.status !== 'skipped' && t.dueDate)
    .slice(0, 4);

  const categoryChartData = useMemo(() => {
    const counts = new Map<string, { category: string; count: number; avgProficiency: number; total: number }>();
    for (const s of skills) {
      const entry = counts.get(s.category) || { category: s.category, count: 0, avgProficiency: 0, total: 0 };
      entry.count += 1;
      entry.total += s.proficiency;
      entry.avgProficiency = Number((entry.total / entry.count).toFixed(1));
      counts.set(s.category, entry);
    }
    return Array.from(counts.values()).slice(0, 8);
  }, [skills]);

  const recentHoursData = useMemo(() => {
    return progressRecords
      .slice(0, 7)
      .reverse()
      .map((r) => ({
        date: r.date.slice(5),
        hours: r.hoursStudied,
      }));
  }, [progressRecords]);

  return (
    <div className="space-y-6">
      {/* Greeting & Onboarding Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Target Role: {profile?.targetRoleName || targetRole?.name || 'Select a target role'}
          </p>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            Welcome back, {profile?.displayName?.split(' ')[0] || 'Builder'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track your verified skill readiness, close high-priority role gaps, and ship portfolio projects.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!profile?.onboardingCompleted && (
            <button
              type="button"
              onClick={() => onNavigate('onboarding')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 whitespace-nowrap"
            >
              <UserCheck className="w-4 h-4" />
              Complete Onboarding
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('analysis')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            <Target className="w-4 h-4" />
            Analyze Readiness
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Career Readiness (Self-Assessment)
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {readinessScore}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono tabular-nums">
            Skill match: {skillMatchPct}%
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Skills Matched vs. Remaining
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-slate-900 dark:text-white">
            {liveScore?.matchedCount ?? 0}
            <span className="text-base font-normal text-slate-400">
              {' '}
              / {(liveScore?.matchedCount ?? 0) + (liveScore?.improveCount ?? 0) + (liveScore?.missingCount ?? 0)}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono tabular-nums">
            {skills.length} total skills logged
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Roadmap Completion
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {roadmapProgressPct}%
            <span className="text-base font-normal text-slate-400 ml-1.5">
              ({completedTasks}/{activeTasks.length})
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate">
            {activeRoadmap ? activeRoadmap.title : 'No active roadmap'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Study Hours & Streak
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-slate-900 dark:text-white">
            {(profile?.totalHoursStudied ?? 0).toFixed(1)}h
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono tabular-nums">
            {profile?.streakDays ?? 0} day streak · {projects.length} projects
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recommended Next Task & Active Roadmap */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Recommended Next Action
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('roadmap')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                Open Roadmap <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeRoadmap && activeTasks.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1 font-mono tabular-nums">
                  <span className="text-slate-500 dark:text-slate-400 truncate pr-3">{activeRoadmap.title}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{roadmapProgressPct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 transition-all" style={{ width: `${roadmapProgressPct}%` }} />
                </div>
              </div>
            )}

            {nextTask ? (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Phase {nextTask.phaseIndex}: {nextTask.phaseName} · {nextTask.skillName} · {nextTask.priority} priority
                </div>
                <div className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
                  {nextTask.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                  {nextTask.description || nextTask.assignment}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span>Est: {nextTask.estimatedHours || 2}h</span>
                  <span>Due: {nextTask.dueDate || 'Flexible'}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                  {skills.length === 0
                    ? 'Add your current skills first, then generate an AI-tailored learning roadmap.'
                    : 'No active roadmap tasks yet. Generate a 30, 60, or 90-day roadmap from your skill gaps.'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate(skills.length === 0 ? 'skills' : 'roadmap')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-indigo-600 hover:opacity-90"
                >
                  {skills.length === 0 ? 'Add Your Skills' : 'Generate Roadmap'}
                </button>
              </div>
            )}

            {upcomingDeadlines.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Upcoming Roadmap Deadlines
                </div>
                <div className="space-y-2">
                  {upcomingDeadlines.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                    >
                      <span className="text-slate-700 dark:text-slate-200 truncate pr-3">{t.title}</span>
                      <span className="font-mono tabular-nums text-slate-500 shrink-0">{t.dueDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Skill Proficiency Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Skill Inventory by Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('skills')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Manage Skills
              </button>
            </div>

            {categoryChartData.length > 0 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="avgProficiency" name="Avg Proficiency (1-5)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  Log your programming languages, frameworks, and tools to see category proficiency.
                </p>
                <button
                  onClick={() => onNavigate('skills')}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Add First Skill
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          {/* Skill Gap Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Top Priority Skill Gaps
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Est. {liveScore?.estimatedHours ?? 0}h total
              </span>
            </div>

            {liveScore && liveScore.gapItems.filter((g) => g.gapScore > 0).length > 0 ? (
              <div className="space-y-3">
                {liveScore.gapItems
                  .filter((g) => g.gapScore > 0)
                  .slice(0, 5)
                  .map((gap) => (
                    <div
                      key={gap.skillName}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-slate-900 dark:text-white">{gap.skillName}</span>
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            gap.priority === 'high'
                              ? 'text-red-600 dark:text-red-400'
                              : gap.priority === 'medium'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {gap.priority.toUpperCase()} · {gap.currentProficiency}/{gap.targetProficiency}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {gap.category} · ~{gap.estimatedHours}h study estimate
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>All benchmarked skills for {targetRole?.name} are currently met!</span>
              </div>
            )}

            <button
              onClick={() => onNavigate('analysis')}
              className="mt-4 w-full py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {latestAnalysis ? 'View Full AI Analysis Report' : 'Run AI Gap Analysis Report'}
            </button>
          </div>

          {/* Learning Hours Log */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Recent Study Hours
              </h3>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Log Hours
              </button>
            </div>
            {recentHoursData.length > 0 ? (
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentHoursData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="hours" name="Hours" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                No study sessions logged yet. Log hours in Progress Analytics to build your streak.
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('careers')}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-colors"
            >
              <Compass className="w-4 h-4 text-indigo-600 mb-2" />
              <div className="text-xs font-semibold text-slate-900 dark:text-white">Compare Roles</div>
              <div className="text-[11px] text-slate-500 mt-0.5">15 career tracks</div>
            </button>
            <button
              onClick={() => onNavigate('portfolio')}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-colors"
            >
              <FolderGit2 className="w-4 h-4 text-indigo-600 mb-2" />
              <div className="text-xs font-semibold text-slate-900 dark:text-white">Portfolio Review</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{projects.length} projects</div>
            </button>
            <button
              onClick={() => onNavigate('resources')}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-colors"
            >
              <BookOpen className="w-4 h-4 text-indigo-600 mb-2" />
              <div className="text-xs font-semibold text-slate-900 dark:text-white">Study Resources</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Docs & search guides</div>
            </button>
            <button
              onClick={() => onNavigate('coach')}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-colors"
            >
              <Target className="w-4 h-4 text-indigo-600 mb-2" />
              <div className="text-xs font-semibold text-slate-900 dark:text-white">AI Career Coach</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Contextual Q&A</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
