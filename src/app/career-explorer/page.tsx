'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, GitCompare, Search } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAppToast } from '@/components/Providers';
import { CAREER_ROLE_DISCLAIMER, SEEDED_CAREER_ROLES } from '@/shared/catalogData';
import type { CareerRole } from '@/shared/types';
import type { DeterministicAnalysisSummary } from '@/shared/scoringEngine';

export default function CareerExplorerPage() {
  const { notify } = useAppToast();
  const [roles, setRoles] = useState<CareerRole[]>(SEEDED_CAREER_ROLES);
  const [query, setQuery] = useState('');
  const [roleAId, setRoleAId] = useState(SEEDED_CAREER_ROLES[0].id);
  const [roleBId, setRoleBId] = useState(SEEDED_CAREER_ROLES[1].id);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<{
    comparisonA: DeterministicAnalysisSummary;
    comparisonB: DeterministicAnalysisSummary;
    sharedSkills: string[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/careers')
      .then((r) => r.json())
      .then((json) => {
        if (json.roles?.length) setRoles(json.roles);
      })
      .catch(() => {});
  }, []);

  async function runComparison() {
    setComparing(true);
    try {
      const res = await fetch('/api/careers/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleAId, roleBId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Comparison failed');
      setComparison(json);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to compare roles', 'error');
    } finally {
      setComparing(false);
    }
  }

  async function setAsTarget(roleId: string, roleName: string) {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRoleId: roleId }),
    });
    if (res.ok) {
      notify(`Target career updated to ${roleName}.`, 'success');
    }
  }

  const filtered = roles.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.domain.toLowerCase().includes(q) ||
      r.requiredSkills.some((s) => s.name.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell
      title="Career Explorer"
      subtitle="Compare career paths against your current skill inventory and select your target role."
    >
      <div className="space-y-8">
        {/* Personalized Role Comparison */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-indigo-600" />
                Personalized Career Comparison
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Compare readiness and missing study hours side-by-side using your logged skills.
              </p>
            </div>
            <button
              onClick={runComparison}
              disabled={comparing}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
            >
              {comparing ? 'Comparing...' : 'Compare Roles'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={roleAId}
              onChange={(e) => setRoleAId(e.target.value)}
              className="px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <select
              value={roleBId}
              onChange={(e) => setRoleBId(e.target.value)}
              className="px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {comparison && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[comparison.comparisonA, comparison.comparisonB].map((c) => (
                <div
                  key={c.targetRoleId}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{c.targetRoleName}</span>
                    <span className="font-mono tabular-nums text-base font-bold text-indigo-600">
                      {c.readinessScore}% Ready
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                    {c.matchedCount} matched · {c.improveCount} improve · {c.missingCount} missing · ~{c.estimatedHours}h effort
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Directory */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roles or skills..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-500 max-w-md">{CAREER_ROLE_DISCLAIMER}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((role) => (
              <div
                key={role.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    {role.domain} · {role.seniorityLevel}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                    {role.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    {role.description}
                  </p>
                  <div className="text-xs text-slate-500">
                    Required: {role.requiredSkills.map((s) => s.name).join(', ')}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setAsTarget(role.id, role.name)}
                    className="text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600"
                  >
                    Set as Target
                  </button>
                  <Link
                    href={`/analysis?role=${role.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Analyze <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
