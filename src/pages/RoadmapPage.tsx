import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  List,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ReportSkeleton } from '../components/Skeleton';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { generateRoadmapAPI } from '../services/apiClient';
import {
  addProgressRecord,
  addRoadmapTask,
  createNotification,
  createRoadmapWithTasks,
  deleteRoadmap,
  deleteRoadmapTask,
  subscribeRoadmapTasks,
  updateRoadmap,
  updateRoadmapTask,
  updateUserProfile,
} from '../services/firestoreService';
import type { Roadmap, RoadmapTask } from '../shared/types';

export function RoadmapPage() {
  const { user, profile, skills, analyses, roadmaps, careerRoles } = useApp();
  const { notify } = useToast();

  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [viewMode, setViewMode] = useState<'phases' | 'timeline'>('phases');

  // Generator controls
  const [durationDays, setDurationDays] = useState<number>(60);
  const [customDays, setCustomDays] = useState<number>(45);
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RoadmapTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    phaseIndex: 1,
    phaseName: 'Foundation',
    title: '',
    description: '',
    skillName: '',
    priority: 'medium' as RoadmapTask['priority'],
    estimatedHours: 4,
    dueDate: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
    learningResource: '',
    assignment: '',
  });

  const [confirmDeleteRoadmap, setConfirmDeleteRoadmap] = useState<Roadmap | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<{
    existingActive: Roadmap;
    daysOverride?: number;
  } | null>(null);

  const activeRoadmap =
    roadmaps.find((r) => r.id === selectedRoadmapId) || roadmaps[0] || null;

  useEffect(() => {
    if (!user || !activeRoadmap) {
      setTasks([]);
      return;
    }
    return subscribeRoadmapTasks(user.uid, activeRoadmap.id, setTasks);
  }, [user, activeRoadmap]);

  useEffect(() => {
    if (!taskModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTaskModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [taskModalOpen]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const executeGenerate = async (options?: {
    daysOverride?: number;
    pausePriorRoadmap?: Roadmap;
  }) => {
    if (!user) return;
    setGenerating(true);
    try {
      const role = careerRoles.find((r) => r.id === profile?.targetRoleId) || careerRoles[0];
      const latestGapItems =
        analyses.find((a) => a.targetRoleId === role.id)?.gapItems || analyses[0]?.gapItems || [];
      const finalDays =
        options?.daysOverride ??
        (useCustomDays ? Math.max(7, Math.min(365, customDays)) : durationDays);

      const res = await generateRoadmapAPI({
        targetRoleId: role.id,
        customRole: role.isCustom ? role : undefined,
        durationDays: finalDays,
        hoursPerWeek: profile?.hoursPerWeek || 10,
        learningStyle: profile?.learningStyle || 'Hands-on projects',
        budgetPreference: profile?.budgetPreference || 'free_preferred',
        gapItems: latestGapItems,
        existingSkills: skills,
      });

      if (options?.pausePriorRoadmap) {
        await updateRoadmap(user.uid, options.pausePriorRoadmap.id, { status: 'paused' });
      }

      const newId = await createRoadmapWithTasks(
        user.uid,
        {
          title: res.roadmap.title,
          targetRoleId: res.roadmap.targetRoleId,
          targetRoleName: res.roadmap.targetRoleName,
          durationDays: res.roadmap.durationDays,
          hoursPerWeek: res.roadmap.hoursPerWeek,
          status: 'active',
          phases: res.roadmap.phases,
        },
        res.roadmap.tasks
      );

      await createNotification(
        user.uid,
        'New Learning Roadmap Created',
        `Generated ${res.roadmap.durationDays}-day roadmap for ${res.roadmap.targetRoleName} with ${res.roadmap.tasks.length} actionable tasks.`,
        'roadmap'
      );

      setSelectedRoadmapId(newId);
      notify('Personalized roadmap generated and saved!', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to generate roadmap.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const requestGenerate = (daysOverride?: number) => {
    const existingActive = roadmaps.find((r) => r.status === 'active');
    if (existingActive) {
      setConfirmOverwrite({ existingActive, daysOverride });
      return;
    }
    void executeGenerate({ daysOverride });
  };

  const handleStatusChange = async (task: RoadmapTask, nextStatus: RoadmapTask['status']) => {
    if (!user || !activeRoadmap) return;
    try {
      await updateRoadmapTask(user.uid, activeRoadmap.id, task.id, { status: nextStatus });
      if (nextStatus === 'completed' && task.status !== 'completed') {
        const hrs = task.estimatedHours || 2;
        await addProgressRecord(user.uid, {
          date: new Date().toISOString().slice(0, 10),
          hoursStudied: Math.min(24, hrs),
          tasksCompleted: 1,
          note: `Completed task: ${task.title}`,
        });
        await updateUserProfile(user.uid, {
          totalHoursStudied: (profile?.totalHoursStudied || 0) + hrs,
          streakDays: Math.max(1, (profile?.streakDays || 0) + 1),
        });
        notify(`Task completed! +${hrs}h logged to your study progress.`, 'success');
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update task.', 'error');
    }
  };

  const handleMoveTask = async (task: RoadmapTask, dir: -1 | 1) => {
    if (!user || !activeRoadmap) return;
    const phaseTasks = tasks.filter((t) => t.phaseIndex === task.phaseIndex);
    const idx = phaseTasks.findIndex((t) => t.id === task.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= phaseTasks.length) return;
    const neighbor = phaseTasks[swapIdx];
    await updateRoadmapTask(user.uid, activeRoadmap.id, task.id, { orderIndex: neighbor.orderIndex });
    await updateRoadmapTask(user.uid, activeRoadmap.id, neighbor.id, { orderIndex: task.orderIndex });
  };

  const openAddTask = () => {
    setEditingTask(null);
    setTaskForm({
      phaseIndex: 1,
      phaseName: 'Foundation',
      title: '',
      description: '',
      skillName: '',
      priority: 'medium',
      estimatedHours: 4,
      dueDate: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
      learningResource: '',
      assignment: '',
    });
    setTaskModalOpen(true);
  };

  const openEditTask = (task: RoadmapTask) => {
    setEditingTask(task);
    setTaskForm({
      phaseIndex: task.phaseIndex,
      phaseName: task.phaseName,
      title: task.title,
      description: task.description || '',
      skillName: task.skillName,
      priority: task.priority,
      estimatedHours: task.estimatedHours || 4,
      dueDate: task.dueDate || '',
      learningResource: task.learningResource || '',
      assignment: task.assignment || '',
    });
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeRoadmap || !taskForm.title.trim() || !taskForm.skillName.trim()) {
      notify('Title and skill name are required.', 'error');
      return;
    }
    try {
      if (editingTask) {
        await updateRoadmapTask(user.uid, activeRoadmap.id, editingTask.id, taskForm);
        notify('Task updated.', 'success');
      } else {
        await addRoadmapTask(user.uid, activeRoadmap.id, {
          ...taskForm,
          startDate: new Date().toISOString().slice(0, 10),
          status: 'not_started',
          orderIndex: tasks.length,
        });
        notify('Custom task added to roadmap.', 'success');
      }
      setTaskModalOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save task.', 'error');
    }
  };

  const phaseNames = [
    'Foundation',
    'Core Skills',
    'Advanced Skills',
    'Projects & Portfolio',
    'Interview & Job Preparation',
  ];

  const groupedByPhase = useMemo(() => {
    return [1, 2, 3, 4, 5].map((phaseIndex) => ({
      phaseIndex,
      name: activeRoadmap?.phases?.find((p) => p.phaseIndex === phaseIndex)?.name || phaseNames[phaseIndex - 1],
      goal: activeRoadmap?.phases?.find((p) => p.phaseIndex === phaseIndex)?.goal || '',
      tasks: tasks.filter((t) => t.phaseIndex === phaseIndex),
    }));
  }, [tasks, activeRoadmap]);

  const sortedTimelineTasks = useMemo(() => {
    return [...tasks].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '') || a.orderIndex - b.orderIndex);
  }, [tasks]);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Generator Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Personalized Learning Roadmap Engine</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Target: {profile?.targetRoleName || 'Software Development Engineer'} · {profile?.hoursPerWeek || 12}h/week · {profile?.learningStyle || 'Hands-on projects'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setUseCustomDays(false);
                  setDurationDays(d);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  !useCustomDays && durationDays === d
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {d} Days
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUseCustomDays(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                useCustomDays
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Custom
            </button>
          </div>

          {useCustomDays && (
            <input
              type="number"
              aria-label="Custom roadmap duration in days"
              min={7}
              max={365}
              value={customDays}
              onChange={(e) => setCustomDays(Number(e.target.value))}
              className="w-20 px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
            />
          )}

          <button
            type="button"
            onClick={() => requestGenerate()}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {generating ? 'Building Roadmap...' : 'Generate Roadmap'}
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {generating && <ReportSkeleton />}

      {/* Roadmap Selector & Active View */}
      {!generating && !activeRoadmap ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
          <h3 className="text-base font-semibold mb-2">No Roadmaps Generated Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Pick a duration (30, 60, 90, or custom days) above and click "Generate Roadmap" to build a 5-phase learning plan calibrated to your skill gaps.
          </p>
        </div>
      ) : null}

      {!generating && activeRoadmap && (
        <>
          {/* Active Roadmap Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <select
                    aria-label="Select roadmap"
                    value={activeRoadmap.id}
                    onChange={(e) => setSelectedRoadmapId(e.target.value)}
                    className="bg-transparent font-medium text-indigo-600 dark:text-indigo-400 focus:outline-hidden"
                  >
                    {roadmaps.map((r) => (
                      <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900">
                        {r.title}
                      </option>
                    ))}
                  </select>
                  <span>· {activeRoadmap.durationDays} days</span>
                  <span>
                    · Status:{' '}
                    <span
                      className={
                        activeRoadmap.status === 'active'
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-amber-600 dark:text-amber-400 font-semibold'
                      }
                    >
                      {activeRoadmap.status}
                    </span>
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {activeRoadmap.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('phases')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${
                      viewMode === 'phases' ? 'bg-white dark:bg-slate-800 font-medium shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> Phases
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('timeline')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${
                      viewMode === 'timeline' ? 'bg-white dark:bg-slate-800 font-medium shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Timeline
                  </button>
                </div>

                <button
                  type="button"
                  onClick={openAddTask}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>

                <button
                  type="button"
                  onClick={() => requestGenerate(activeRoadmap.durationDays)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>

                <button
                  type="button"
                  onClick={() =>
                    user &&
                    updateRoadmap(user.uid, activeRoadmap.id, {
                      status: activeRoadmap.status === 'paused' ? 'active' : 'paused',
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                  type="button"
                  onClick={() => setConfirmDeleteRoadmap(activeRoadmap)}
                  aria-label="Delete roadmap"
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-mono tabular-nums">
                <span className="text-slate-600 dark:text-slate-300">
                  Completion Progress: {completedCount} / {tasks.length} tasks
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{progressPct}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>

          {/* Phases or Timeline View */}
          {viewMode === 'phases' ? (
            <div className="space-y-5">
              {groupedByPhase.map((phase) => (
                <div
                  key={phase.phaseIndex}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                >
                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        Phase 0{phase.phaseIndex}
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                        {phase.name}
                      </h4>
                      {phase.goal && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{phase.goal}</p>
                      )}
                    </div>
                    <span className="font-mono text-xs tabular-nums text-slate-500">
                      {phase.tasks.filter((t) => t.status === 'completed').length}/{phase.tasks.length} done
                    </span>
                  </div>

                  {phase.tasks.length === 0 ? (
                    <div className="px-6 py-5 text-xs text-slate-500">No tasks assigned to this phase yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {phase.tasks.map((task, idxInPhase) => (
                        <div key={task.id} className="p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                                {task.skillName}
                              </span>
                              <span>·</span>
                              <span className="font-mono">{task.priority} priority</span>
                              <span>·</span>
                              <span className="font-mono tabular-nums">{task.estimatedHours || 2}h</span>
                              {task.dueDate && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono tabular-nums">Due {task.dueDate}</span>
                                </>
                              )}
                            </div>
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
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                            {(task.learningResource || task.assignment) && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                                {task.learningResource && <span>Resource: {task.learningResource}</span>}
                                {task.learningResource && task.assignment && <span> · </span>}
                                {task.assignment && <span>Deliverable: {task.assignment}</span>}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              aria-label={`Status for ${task.title}`}
                              value={task.status}
                              onChange={(e) =>
                                handleStatusChange(task, e.target.value as RoadmapTask['status'])
                              }
                              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="skipped">Skipped</option>
                            </select>

                            <button
                              type="button"
                              disabled={idxInPhase === 0}
                              onClick={() => handleMoveTask(task, -1)}
                              aria-label="Move up"
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idxInPhase === phase.tasks.length - 1}
                              onClick={() => handleMoveTask(task, 1)}
                              aria-label="Move down"
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditTask(task)}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-1.5"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => user && deleteRoadmapTask(user.uid, activeRoadmap.id, task.id)}
                              aria-label="Delete task"
                              className="p-1.5 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-base font-semibold">Chronological Task Timeline</h4>
                <span className="text-xs font-mono text-slate-500">
                  {sortedTimelineTasks.length} scheduled tasks
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedTimelineTasks.map((task) => {
                  const isOverdue =
                    Boolean(task.dueDate) &&
                    task.dueDate! < todayIso &&
                    task.status !== 'completed' &&
                    task.status !== 'skipped';
                  return (
                    <div
                      key={task.id}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 min-w-0">
                        <span className="font-mono tabular-nums text-slate-500 sm:w-44 shrink-0">
                          {task.startDate || 'TBD'} → {task.dueDate || 'TBD'}
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <div
                            className={`text-sm font-semibold truncate ${
                              task.status === 'completed'
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </div>
                          <div className="text-slate-500">
                            Phase {task.phaseIndex} · {task.skillName} · {task.estimatedHours || 2}h · {task.priority} priority
                            {isOverdue ? (
                              <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">Overdue</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          aria-label={`Timeline status for ${task.title}`}
                          value={task.status}
                          onChange={(e) =>
                            handleStatusChange(task, e.target.value as RoadmapTask['status'])
                          }
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="skipped">Skipped</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Task Modal */}
      {taskModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTaskModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <form
            onSubmit={handleSaveTask}
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{editingTask ? 'Edit Roadmap Task' : 'Add Custom Task'}</h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setTaskModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Task Title</label>
                <input
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Phase</label>
                <select
                  value={taskForm.phaseIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setTaskForm({ ...taskForm, phaseIndex: idx, phaseName: phaseNames[idx - 1] });
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {phaseNames.map((n, i) => (
                    <option key={n} value={i + 1}>
                      Phase {i + 1}: {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Associated Skill</label>
                <input
                  required
                  value={taskForm.skillName}
                  onChange={(e) => setTaskForm({ ...taskForm, skillName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as RoadmapTask['priority'] })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Est. Hours</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={taskForm.estimatedHours}
                  onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Learning Resource</label>
                <input
                  value={taskForm.learningResource}
                  onChange={(e) => setTaskForm({ ...taskForm, learningResource: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Practical Assignment / Deliverable</label>
                <input
                  value={taskForm.assignment}
                  onChange={(e) => setTaskForm({ ...taskForm, assignment: e.target.value })}
                  placeholder="e.g. Build typed CRUD endpoint with Zod validation and push to GitHub"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Overwrite Active Roadmap Confirmation */}
      <ConfirmDialog
        open={Boolean(confirmOverwrite)}
        title="Replace Active Roadmap?"
        destructive={false}
        description={`You currently have an active roadmap ("${confirmOverwrite?.existingActive.title}"). Generating a new roadmap will pause that active plan so you don't lose its task history, and set the new roadmap as active.`}
        confirmLabel="Pause Existing & Generate"
        onConfirm={() => {
          const payload = confirmOverwrite;
          setConfirmOverwrite(null);
          if (payload) {
            void executeGenerate({
              daysOverride: payload.daysOverride,
              pausePriorRoadmap: payload.existingActive,
            });
          }
        }}
        onCancel={() => setConfirmOverwrite(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteRoadmap)}
        title="Delete Roadmap"
        description={`Delete "${confirmDeleteRoadmap?.title}" and all its tasks?`}
        confirmLabel="Delete Roadmap"
        onConfirm={async () => {
          if (user && confirmDeleteRoadmap) {
            await deleteRoadmap(user.uid, confirmDeleteRoadmap.id);
            setSelectedRoadmapId(null);
            notify('Roadmap deleted.', 'info');
          }
          setConfirmDeleteRoadmap(null);
        }}
        onCancel={() => setConfirmDeleteRoadmap(null)}
      />
    </div>
  );
}
