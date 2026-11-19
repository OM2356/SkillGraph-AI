'use client';

import React, { useEffect, useState } from 'react';
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
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ChartTooltip } from '@/components/ChartTooltip';
import { CardsSkeleton } from '@/components/Skeleton';
import { useAppToast } from '@/components/Providers';
import type { ProgressRecord } from '@/shared/types';

interface AnalyticsResponse {
  readinessTrend: Array<{
    date: string;
    role: string;
    readinessScore: number;
    matchPercentage: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    avgProficiency: number;
  }>;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  projectStats: {
    total: number;
    completed: number;
    inProgress: number;
    idea: number;
  };
  progressHistory: ProgressRecord[];
}

export default function AnalyticsPage() {
  const { notify } = useAppToast();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoursStudied, setHoursStudied] = useState(2);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function logSession(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoursStudied, note }),
      });
      if (!res.ok) throw new Error('Failed to log session');
      setNote('');
      notify('Study session logged.', 'success');
      await loadAnalytics();
    } catch {
      notify('Unable to log session.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Analytics & Progress"
      subtitle="Track readiness progression, skill category depth, and weekly study logs."
    >
      {loading ? (
        <CardsSkeleton count={4} />
      ) : data ? (
        <div className="space-y-6">
          {/* Log Study Hours */}
          <form
            onSubmit={logSession}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
          >
            <div className="w-full sm:w-36">
              <label className="block text-xs font-medium mb-1">Hours Studied</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hoursStudied}
                onChange={(e) => setHoursStudied(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Study Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Practiced PostgreSQL joins & indexing"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {saving ? 'Logging...' : 'Log Session'}
            </button>
          </form>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Readiness Trend */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-4">Readiness Score Trend</h2>
              {data.readinessTrend.length === 0 ? (
                <p className="text-xs text-slate-500 py-12 text-center">
                  Run gap analyses over time to visualize your readiness score trajectory.
                </p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.readinessTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="readinessScore"
                        name="Readiness %"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-4">Average Proficiency by Skill Category</h2>
              {data.categoryBreakdown.length === 0 ? (
                <p className="text-xs text-slate-500 py-12 text-center">
                  Log skills to see your proficiency distribution across domains.
                </p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.categoryBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} />
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="avgProficiency" name="Avg Level (1-5)" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Activity History */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">Recent Study & Milestone Log</h2>
            {data.progressHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No study sessions logged yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...data.progressHistory].reverse().slice(0, 10).map((rec) => (
                  <div key={rec.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-mono tabular-nums text-slate-500 mr-3">{rec.date}</span>
                      <span className="text-slate-800 dark:text-slate-200">{rec.note || 'Study session'}</span>
                    </div>
                    <span className="font-mono tabular-nums text-indigo-600 shrink-0">
                      {rec.hoursStudied}h · {rec.tasksCompleted} tasks
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
