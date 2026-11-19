'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  FolderGit2,
  Layers,
  Map as MapIcon,
  Plus,
  Sparkles,
  Target,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { CardsSkeleton } from '@/components/Skeleton';
import type {
  ProgressRecord,
  Roadmap,
  RoadmapTask,
  SkillGapAnalysis,
  UserProfile,
  UserProject,
  UserSkill,
} from '@/shared/types';

interface DashboardResponse {
  profile: UserProfile;
  stats: {
    skillCount: number;
    projectCount: number;
    completedProjects: number;
    readinessScore: number | null;
    matchedSkillsCount: number;
    missingSkillsCount: number;
    activeRoadmapProgress: number;
    totalTasksCompleted: number;
    totalHoursStudied: number;
  };
  latestAnalysis: SkillGapAnalysis | null;
  activeRoadmap: (Roadmap & { tasks: RoadmapTask[]; progressPercentage: number }) | null;
  recentProjects: UserProject[];
  recentProgress: ProgressRecord[];
  skills: UserSkill[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load dashboard');
        return json as DashboardResponse;
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell
      title="Career Dashboard"
      subtitle="Overview of your readiness, prioritized gaps, active roadmap, and study pace."
      actions={
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Run Gap Analysis
        </Link>
      }
    >
      {loading ? (
        <CardsSkeleton count={4} />
      ) : error ? (
        <div className="p-5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {!data.profile.onboardingCompleted && (
            <div className="p-5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
                  Complete your career onboarding
                </h2>
                <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-1">
                  Set your target role, weekly study hours, and starting skills to calibrate diagnostics.
                </p>
              </div>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap shrink-0"
              >
                Start Onboarding
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Readiness Score</div>
              <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.readinessScore !== null ? `${data.stats.readinessScore}%` : 'Not Run'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                {data.profile.targetRoleName || 'Select target role'}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Skills Logged</div>
              <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.skillCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {data.stats.matchedSkillsCount} matched · {data.stats.missingSkillsCount} gaps
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Roadmap Progress</div>
              <div className="font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {data.stats.activeRoadmapProgress}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {data.stats.totalTasksCompleted} tasks completed
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Portfolio & Study</div>
              <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.projectCount} Projects
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                {data.stats.totalHoursStudied}h logged
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Priority Gaps */}
            <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600" />
                    Top Priority Skill Gaps
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ranked by weighted importance impact from your latest diagnostic
                  </p>
                </div>
                <Link href="/analysis" className="text-xs font-medium text-indigo-600 hover:underline">
                  Full Report →
                </Link>
              </div>

              {data.latestAnalysis ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.latestAnalysis.gapItems
                    .filter((g) => g.gapScore > 0)
                    .slice(0, 6)
                    .map((g) => (
                      <div key={g.skillName} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {g.skillName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {g.category} · {g.tier} · {g.estimatedHours}h est.
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono tabular-nums text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Lvl {g.currentProficiency} → {g.targetProficiency}
                          </div>
                          <div
                            className={`text-[11px] font-medium capitalize ${
                              g.priority === 'high'
                                ? 'text-red-600 dark:text-red-400'
                                : g.priority === 'medium'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {g.priority} priority
                          </div>
                        </div>
                      </div>
                    ))}
                  {data.latestAnalysis.gapItems.every((g) => g.gapScore === 0) && (
                    <p className="text-sm text-emerald-600 py-6 text-center">
                      All benchmark skills matched for {data.latestAnalysis.targetRoleName}.
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-slate-500">
                    No skill gap analysis saved yet. Log your skills and run your first diagnostic.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Link
                      href="/skills"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <Layers className="w-3.5 h-3.5" /> Add Skills
                    </Link>
                    <Link
                      href="/analysis"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Run Analysis
                    </Link>
                  </div>
                </div>
              )}
            </section>

            {/* Active Roadmap & Projects */}
            <section className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-emerald-600" />
                    Active Roadmap
                  </h2>
                  <Link href="/roadmap" className="text-xs font-medium text-indigo-600 hover:underline">
                    Manage →
                  </Link>
                </div>

                {data.activeRoadmap ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {data.activeRoadmap.title}
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono tabular-nums">
                        <span>{data.activeRoadmap.durationDays} days · {data.activeRoadmap.status}</span>
                        <span>{data.activeRoadmap.progressPercentage}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${data.activeRoadmap.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {data.activeRoadmap.tasks
                        .filter((t) => t.status !== 'completed')
                        .slice(0, 3)
                        .map((t) => (
                          <div
                            key={t.id}
                            className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {t.title}
                            </span>
                            <span className="font-mono tabular-nums text-slate-500 shrink-0">
                              {t.estimatedHours}h
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center space-y-3">
                    <p className="text-xs text-slate-500">No learning roadmap created yet.</p>
                    <Link
                      href="/roadmap"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-indigo-600"
                    >
                      <Plus className="w-3.5 h-3.5" /> Generate Roadmap
                    </Link>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-indigo-600" />
                    Recent Portfolio Builds
                  </h2>
                  <Link href="/projects" className="text-xs font-medium text-indigo-600 hover:underline">
                    Projects →
                  </Link>
                </div>

                {data.recentProjects.length > 0 ? (
                  <div className="space-y-2.5">
                    {data.recentProjects.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {p.title}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500 capitalize shrink-0">
                          {p.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {p.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Add projects you’ve built to unlock project evidence bonuses in gap diagnostics.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
