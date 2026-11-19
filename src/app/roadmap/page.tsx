'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  ListChecks,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CardsSkeleton } from '@/components/Skeleton';
import { useAppToast } from '@/components/Providers';
import { SEEDED_CAREER_ROLES } from '@/shared/catalogData';
import type { Roadmap, RoadmapTask } from '@/shared/types';

type RoadmapWithTasks = Roadmap & {
  tasks: RoadmapTask[];
  progressPercentage: number;
  completedCount: number;
  totalTasks: number;
};

function RoadmapContent() {
  const searchParams = useSearchParams();
  const { notify } = useAppToast();

  const [roadmaps, setRoadmaps] = useState<RoadmapWithTasks[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'phases' | 'timeline'>('phases');

  const [roleId, setRoleId] = useState(searchParams.get('role') || SEEDED_CAREER_ROLES[1].id);
  const [durationPreset, setDurationPreset] = useState<'30' | '60' | '90' | 'custom'>('30');
  const [customDays, setCustomDays] = useState(45);
  const [hoursPerWeek, setHoursPerWeek] = useState(12);
  const [learningStyle, setLearningStyle] = useState('Hands-on projects & official docs');
  const [warning, setWarning] = useState('');

  // Add custom task state
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSkill, setTaskSkill] = useState('');
  const [taskPhase, setTaskPhase] = useState(1);
  const [taskHours, setTaskHours] = useState(3);
  const [taskResource, setTaskResource] = useState('');
  const [taskAssignment, setTaskAssignment] = useState('');

  const [deleteRoadmapId, setDeleteRoadmapId] = useState<string | null>(null);

  async function loadRoadmaps() {
    setLoading(true);
    try {
      const res = await fetch('/api/roadmaps');
      const json = await res.json();
      if (res.ok) {
        const list: RoadmapWithTasks[] = json.roadmaps || [];
        setRoadmaps(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoadmaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeRoadmap = roadmaps.find((r) => r.id === selectedId) || roadmaps[0] || null;

  async function generateRoadmap() {
    setGenerating(true);
    setWarning('');
    const days = durationPreset === 'custom' ? customDays : Number(durationPreset);
    try {
      const res = await fetch('/api/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRoleId: roleId,
          durationDays: days,
          hoursPerWeek,
          learningStyle,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate roadmap');
      if (json.aiWarning) setWarning(json.aiWarning);
      const created: RoadmapWithTasks = json.roadmap;
      setRoadmaps((prev) => [created, ...prev]);
      setSelectedId(created.id);
      notify(`Generated "${created.title}".`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to generate roadmap', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function togglePauseResume(r: RoadmapWithTasks) {
    const nextStatus = r.status === 'paused' ? 'active' : 'paused';
    const res = await fetch(`/api/roadmaps/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      setRoadmaps((prev) =>
        prev.map((item) => (item.id === r.id ? { ...item, status: nextStatus } : item))
      );
      notify(`Roadmap ${nextStatus === 'paused' ? 'paused' : 'resumed'}.`, 'info');
    }
  }

  async function updateTaskStatus(task: RoadmapTask, status: RoadmapTask['status']) {
    if (!activeRoadmap) return;
    const res = await fetch(`/api/roadmaps/${activeRoadmap.id}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const json = await res.json();
      setRoadmaps((prev) =>
        prev.map((r) => {
          if (r.id !== activeRoadmap.id) return r;
          const tasks = r.tasks.map((t) => (t.id === task.id ? json.task : t));
          const completed = tasks.filter((t) => t.status === 'completed').length;
          return {
            ...r,
            tasks,
            completedCount: completed,
            progressPercentage: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
          };
        })
      );
    }
  }

  async function moveTask(task: RoadmapTask, direction: -1 | 1) {
    if (!activeRoadmap) return;
    const idx = activeRoadmap.tasks.findIndex((t) => t.id === task.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= activeRoadmap.tasks.length) return;
    const other = activeRoadmap.tasks[swapIdx];

    await Promise.all([
      fetch(`/api/roadmaps/${activeRoadmap.id}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIndex: other.orderIndex }),
      }),
      fetch(`/api/roadmaps/${activeRoadmap.id}/tasks/${other.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIndex: task.orderIndex }),
      }),
    ]);

    const nextTasks = [...activeRoadmap.tasks];
    nextTasks[idx] = { ...other, orderIndex: task.orderIndex };
    nextTasks[swapIdx] = { ...task, orderIndex: other.orderIndex };
    setRoadmaps((prev) =>
      prev.map((r) => (r.id === activeRoadmap.id ? { ...r, tasks: nextTasks } : r))
    );
  }

  async function deleteTask(taskId: string) {
    if (!activeRoadmap) return;
    const res = await fetch(`/api/roadmaps/${activeRoadmap.id}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setRoadmaps((prev) =>
        prev.map((r) => {
          if (r.id !== activeRoadmap.id) return r;
          const tasks = r.tasks.filter((t) => t.id !== taskId);
          const completed = tasks.filter((t) => t.status === 'completed').length;
          return {
            ...r,
            tasks,
            completedCount: completed,
            totalTasks: tasks.length,
            progressPercentage: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
          };
        })
      );
      notify('Task removed.', 'info');
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRoadmap || !taskTitle.trim()) return;
    const phaseName =
      activeRoadmap.phases.find((p) => p.phaseIndex === taskPhase)?.name || `Phase ${taskPhase}`;
    const res = await fetch(`/api/roadmaps/${activeRoadmap.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phaseIndex: taskPhase,
        phaseName,
        title: taskTitle.trim(),
        skillName: taskSkill.trim() || 'Core Engineering',
        estimatedHours: taskHours,
        learningResource: taskResource.trim(),
        assignment: taskAssignment.trim(),
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setRoadmaps((prev) =>
        prev.map((r) => {
          if (r.id !== activeRoadmap.id) return r;
          const tasks = [...r.tasks, json.task];
          const completed = tasks.filter((t) => t.status === 'completed').length;
          return {
            ...r,
            tasks,
            totalTasks: tasks.length,
            progressPercentage: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
          };
        })
      );
      setTaskTitle('');
      setTaskSkill('');
      setTaskResource('');
      setTaskAssignment('');
      setShowAddTask(false);
      notify('Custom task added to roadmap.', 'success');
    } else {
      notify(json.error || 'Failed to add task.', 'error');
    }
  }

  async function confirmDeleteRoadmap() {
    if (!deleteRoadmapId) return;
    const res = await fetch(`/api/roadmaps/${deleteRoadmapId}`, { method: 'DELETE' });
    if (res.ok) {
      const remaining = roadmaps.filter((r) => r.id !== deleteRoadmapId);
      setRoadmaps(remaining);
      setSelectedId(remaining[0]?.id || '');
      notify('Roadmap deleted.', 'info');
    }
    setDeleteRoadmapId(null);
  }

  return (
    <AppShell
      title="Learning Roadmap"
      subtitle="Generate personalized 30, 60, 90-day or custom study plans across 5 structured phases."
    >
      <div className="space-y-6">
        {/* Generator Controls */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Generate Personalized Roadmap</h2>
            <span className="text-xs text-slate-500">Uses your skills, gaps, and weekly hours</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="lg:col-span-2 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              {SEEDED_CAREER_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              value={durationPreset}
              onChange={(e) => setDurationPreset(e.target.value as typeof durationPreset)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              <option value="30">30-Day Sprint</option>
              <option value="60">60-Day Plan</option>
              <option value="90">90-Day Mastery</option>
              <option value="custom">Custom Days</option>
            </select>
            {durationPreset === 'custom' ? (
              <input
                type="number"
                min={7}
                max={365}
                value={customDays}
                onChange={(e) => setCustomDays(Number(e.target.value))}
                placeholder="Days"
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            ) : (
              <input
                type="number"
                min={2}
                max={70}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                placeholder="Hours/week"
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            )}
            <button
              onClick={generateRoadmap}
              disabled={generating}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? 'Generating...' : 'Generate Plan'}
            </button>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <label className="flex items-center gap-2">
              Style:
              <input
                type="text"
                value={learningStyle}
                onChange={(e) => setLearningStyle(e.target.value)}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
            </label>
          </div>
        </section>

        {warning && (
          <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
            {warning}
          </div>
        )}

        {loading || generating ? (
          <CardsSkeleton count={4} />
        ) : roadmaps.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500">
            No learning roadmaps yet. Select a target role and duration above to generate your first roadmap.
          </div>
        ) : activeRoadmap ? (
          <div className="space-y-6">
            {/* Roadmap Switcher + Actions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={activeRoadmap.id}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    {roadmaps.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.progressPercentage}%)
                      </option>
                    ))}
                  </select>
                  <span className="font-mono tabular-nums text-xs text-slate-500">
                    {activeRoadmap.durationDays}d · {activeRoadmap.hoursPerWeek}h/wk · {activeRoadmap.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-xs">
                    <button
                      onClick={() => setViewMode('phases')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${
                        viewMode === 'phases' ? 'bg-slate-900 text-white dark:bg-indigo-600' : ''
                      }`}
                    >
                      <ListChecks className="w-3.5 h-3.5" /> Phases
                    </button>
                    <button
                      onClick={() => setViewMode('timeline')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${
                        viewMode === 'timeline' ? 'bg-slate-900 text-white dark:bg-indigo-600' : ''
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" /> Schedule
                    </button>
                  </div>
                  <button
                    onClick={() => setShowAddTask((v) => !v)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                  <button
                    onClick={() => togglePauseResume(activeRoadmap)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    {activeRoadmap.status === 'paused' ? (
                      <>
                        <Play className="w-3.5 h-3.5" /> Resume
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteRoadmapId(activeRoadmap.id)}
                    aria-label="Delete roadmap"
                    className="p-1.5 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono tabular-nums">
                  <span>
                    {activeRoadmap.completedCount} / {activeRoadmap.tasks.length} tasks completed
                  </span>
                  <span className="font-semibold text-emerald-600">{activeRoadmap.progressPercentage}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${activeRoadmap.progressPercentage}%` }}
                  />
                </div>
              </div>

              {showAddTask && (
                <form
                  onSubmit={addTask}
                  className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
                >
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Task title"
                    className="lg:col-span-2 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                  <input
                    type="text"
                    value={taskSkill}
                    onChange={(e) => setTaskSkill(e.target.value)}
                    placeholder="Skill (e.g. Docker)"
                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                  <select
                    value={taskPhase}
                    onChange={(e) => setTaskPhase(Number(e.target.value))}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    {activeRoadmap.phases.map((p) => (
                      <option key={p.phaseIndex} value={p.phaseIndex}>
                        {p.phaseIndex}. {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={taskHours}
                    onChange={(e) => setTaskHours(Number(e.target.value))}
                    placeholder="Hours"
                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white"
                  >
                    Save Task
                  </button>
                  <input
                    type="text"
                    value={taskResource}
                    onChange={(e) => setTaskResource(e.target.value)}
                    placeholder="Learning resource label"
                    className="lg:col-span-3 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                  <input
                    type="text"
                    value={taskAssignment}
                    onChange={(e) => setTaskAssignment(e.target.value)}
                    placeholder="Practical assignment deliverable"
                    className="lg:col-span-3 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </form>
              )}
            </div>

            {viewMode === 'phases' ? (
              <div className="space-y-5">
                {activeRoadmap.phases.map((phase) => {
                  const phaseTasks = activeRoadmap.tasks.filter((t) => t.phaseIndex === phase.phaseIndex);
                  return (
                    <div
                      key={phase.phaseIndex}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                    >
                      <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                            Phase {phase.phaseIndex} · {phase.weekRange}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {phase.name}
                          </h3>
                        </div>
                        <span className="font-mono tabular-nums text-xs text-slate-500">
                          {phaseTasks.filter((t) => t.status === 'completed').length}/{phaseTasks.length} done
                        </span>
                      </div>

                      {phaseTasks.length === 0 ? (
                        <p className="p-4 text-xs text-slate-500">No tasks in this phase yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {phaseTasks.map((task) => (
                            <div key={task.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="flex items-start gap-3 min-w-0">
                                <button
                                  onClick={() =>
                                    updateTaskStatus(
                                      task,
                                      task.status === 'completed' ? 'not_started' : 'completed'
                                    )
                                  }
                                  aria-label={`Mark ${task.title} complete`}
                                  className={`mt-0.5 shrink-0 ${
                                    task.status === 'completed'
                                      ? 'text-emerald-600'
                                      : 'text-slate-300 hover:text-indigo-600'
                                  }`}
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                                <div className="min-w-0 space-y-1">
                                  <div
                                    className={`text-sm font-semibold ${
                                      task.status === 'completed'
                                        ? 'line-through text-slate-400'
                                        : 'text-slate-900 dark:text-white'
                                    }`}
                                  >
                                    {task.title}
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                      {task.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                                    <span>Skill: {task.skillName}</span>
                                    <span className="font-mono tabular-nums">{task.estimatedHours}h</span>
                                    {task.dueDate && <span className="font-mono tabular-nums">Due {task.dueDate}</span>}
                                    {task.learningResource && <span>Resource: {task.learningResource}</span>}
                                  </div>
                                  {task.assignment && (
                                    <div className="text-xs text-indigo-700 dark:text-indigo-400">
                                      Assignment: {task.assignment}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <select
                                  value={task.status}
                                  onChange={(e) =>
                                    updateTaskStatus(task, e.target.value as RoadmapTask['status'])
                                  }
                                  className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                                >
                                  <option value="not_started">Not Started</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                  <option value="skipped">Skipped</option>
                                </select>
                                <button
                                  onClick={() => moveTask(task, -1)}
                                  aria-label="Move task up"
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveTask(task, 1)}
                                  aria-label="Move task down"
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  aria-label="Delete task"
                                  className="p-1 text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                {[...activeRoadmap.tasks]
                  .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
                  .map((task) => (
                    <div key={task.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="font-mono tabular-nums text-slate-500 shrink-0 w-24">
                          {task.dueDate || 'Unscheduled'}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {task.title}
                          </div>
                          <div className="text-slate-500">
                            {task.phaseName} · {task.skillName}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums capitalize shrink-0">
                        {task.status.replace('_', ' ')} ({task.estimatedHours}h)
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(deleteRoadmapId)}
        title="Delete Roadmap?"
        description="This permanently removes the roadmap and its task checklist."
        confirmLabel="Delete"
        onConfirm={confirmDeleteRoadmap}
        onCancel={() => setDeleteRoadmapId(null)}
      />
    </AppShell>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={<CardsSkeleton count={3} />}>
      <RoadmapContent />
    </Suspense>
  );
}
