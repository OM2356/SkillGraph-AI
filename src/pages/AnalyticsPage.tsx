import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip } from '../components/ChartTooltip';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  addProgressRecord,
  subscribeRoadmapTasks,
  updateUserProfile,
} from '../services/firestoreService';
import type { RoadmapTask } from '../shared/types';

export function AnalyticsPage() {
  const { user, profile, skills, analyses, roadmaps, progressRecords, projects } = useApp();
  const { notify } = useToast();

  const [hours, setHours] = useState(2);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [logging, setLogging] = useState(false);
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

  const completedTasks = activeTasks.filter((t) => t.status === 'completed').length;
  const roadmapCompletionPct =
    activeTasks.length > 0 ? Math.round((completedTasks / activeTasks.length) * 100) : 0;

  const readinessTrend = useMemo(() => {
    return [...analyses]
      .reverse()
      .map((a, idx) => ({
        run: `Run ${idx + 1}`,
        readiness: a.readinessScore,
        match: a.overallMatchPercentage,
      }));
  }, [analyses]);

  const weeklyHours = useMemo(() => {
    return [...progressRecords]
      .filter((r) => r.hoursStudied > 0)
      .slice(0, 10)
      .reverse()
      .map((r) => ({
        date: r.date.slice(5),
        hours: r.hoursStudied,
      }));
  }, [progressRecords]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of skills) {
      map.set(s.category, (map.get(s.category) || 0) + 1);
    }
    return Array.from(map.entries()).map(([category, count]) => ({ category, count }));
  }, [skills]);

  const beforeAfter = useMemo(() => {
    if (analyses.length < 2) return null;
    const latest = analyses[0];
    const earliest = analyses[analyses.length - 1];
    return {
      earliest,
      latest,
      readinessDelta: latest.readinessScore - earliest.readinessScore,
      missingDelta: latest.missingCount - earliest.missingCount,
    };
  }, [analyses]);

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLogging(true);
    try {
      await addProgressRecord(user.uid, {
        date,
        hoursStudied: Math.min(24, Math.max(0.5, Number(hours))),
        tasksCompleted: 0,
        note: note.trim() || 'Focused skill practice session',
      });
      await updateUserProfile(user.uid, {
        totalHoursStudied: (profile?.totalHoursStudied || 0) + Number(hours),
        streakDays: Math.max(1, (profile?.streakDays || 0) + 1),
      });
      setNote('');
      notify('Study session logged!', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to log session.', 'error');
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono tabular-nums">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-sans">Total Hours Studied</div>
          <div className="text-2xl font-bold mt-1">{(profile?.totalHoursStudied ?? 0).toFixed(1)}h</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-sans">Current Streak</div>
          <div className="text-2xl font-bold mt-1">{profile?.streakDays ?? 0} days</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-sans">Roadmap Completion</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {roadmapCompletionPct}%
          </div>
          <div className="text-[11px] text-slate-500 font-sans mt-0.5 truncate">
            {completedTasks} / {activeTasks.length} tasks done
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-sans">Completed Projects</div>
          <div className="text-2xl font-bold mt-1">
            {projects.filter((p) => p.status === 'completed').length} / {projects.length}
          </div>
        </div>
      </div>

      {/* Log Study Session */}
      <form
        onSubmit={handleLogSession}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-end gap-4"
      >
        <div>
          <label className="block text-xs font-medium mb-1">Session Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Hours Studied</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-28 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1">What did you practice?</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Solved 4 graph traversal problems and built REST endpoints"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>
        <button
          type="submit"
          disabled={logging}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {logging ? 'Logging...' : 'Log Session'}
        </button>
      </form>

      {/* Before / After Comparison */}
      {beforeAfter && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold mb-3">Before vs. After Skill Gap Progress</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono tabular-nums text-xs">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 font-sans">First Recorded Analysis</div>
              <div className="text-xl font-bold mt-1">{beforeAfter.earliest.readinessScore}%</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 font-sans">Latest Analysis</div>
              <div className="text-xl font-bold text-indigo-600 mt-1">{beforeAfter.latest.readinessScore}%</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 font-sans">Net Readiness Change</div>
              <div
                className={`text-xl font-bold mt-1 ${
                  beforeAfter.readinessDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {beforeAfter.readinessDelta >= 0 ? '+' : ''}
                {beforeAfter.readinessDelta}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4">Career Readiness Progression</h3>
          {readinessTrend.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={readinessTrend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                  <XAxis dataKey="run" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="readiness" name="Readiness %" stroke="#4f46e5" strokeWidth={2} />
                  <Line type="monotone" dataKey="match" name="Skill Match %" stroke="#059669" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-14 text-center">
              Run at least one skill gap analysis to begin tracking your readiness curve.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4">Study Hours History</h3>
          {weeklyHours.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyHours} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="hours" name="Hours Studied" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-14 text-center">
              Log your study sessions above to visualize weekly study consistency.
            </p>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4">Skills Logged by Category</h3>
          {categoryBreakdown.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdown} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Skills" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-10 text-center">No skills added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
