'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Compass, GitCompare, Search, X } from 'lucide-react';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { CAREER_ROLE_DISCLAIMER, SEEDED_CAREER_ROLES } from '@/shared/catalogData';
import type { CareerRole } from '@/shared/types';

export default function PublicCareersPage() {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('All');
  const [selectedRole, setSelectedRole] = useState<CareerRole | null>(null);
  const [compareA, setCompareA] = useState(SEEDED_CAREER_ROLES[0].id);
  const [compareB, setCompareB] = useState(SEEDED_CAREER_ROLES[1].id);

  const domains = useMemo(
    () => ['All', ...Array.from(new Set(SEEDED_CAREER_ROLES.map((r) => r.domain)))],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEEDED_CAREER_ROLES.filter((role) => {
      if (domain !== 'All' && role.domain !== domain) return false;
      if (!q) return true;
      return (
        role.name.toLowerCase().includes(q) ||
        role.domain.toLowerCase().includes(q) ||
        role.description.toLowerCase().includes(q) ||
        role.requiredSkills.some((s) => s.name.toLowerCase().includes(q))
      );
    });
  }, [query, domain]);

  const roleA = SEEDED_CAREER_ROLES.find((r) => r.id === compareA) || SEEDED_CAREER_ROLES[0];
  const roleB = SEEDED_CAREER_ROLES.find((r) => r.id === compareB) || SEEDED_CAREER_ROLES[1];

  const overlapSkills = useMemo(() => {
    const setA = new Set(
      [...roleA.requiredSkills, ...roleA.importantSkills].map((s) => s.name.toLowerCase())
    );
    return [...roleB.requiredSkills, ...roleB.importantSkills]
      .filter((s) => setA.has(s.name.toLowerCase()))
      .map((s) => s.name);
  }, [roleA, roleB]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <PublicHeader />

      <main className="max-w-7xl mx-auto px-6 py-14 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400 mb-2">
              Career Role Directory
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Explore 15 Technical Career Benchmarks
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
              {CAREER_ROLE_DISCLAIMER}
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
          >
            Benchmark My Skills
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Search & Domain Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles or skills (e.g. Python, SQL, Kubernetes)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            aria-label="Filter by domain"
            className="px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            {domains.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Domains' : d}
              </option>
            ))}
          </select>
        </div>

        {/* Career Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((role) => (
            <div
              key={role.id}
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {role.domain} · {role.seniorityLevel}
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {role.name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {role.description}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Top Required: </span>
                  {role.requiredSkills.slice(0, 4).map((s) => s.name).join(', ')}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-slate-500">
                  {role.requiredSkills.length} required · {role.importantSkills.length} important
                </span>
                <button
                  onClick={() => setSelectedRole(role)}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Inspect Requirements
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Public Side-by-Side Comparison Tool */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                <GitCompare className="w-4 h-4" />
                Side-by-Side Role Comparison
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Compare Skill Requirements Across Any Two Roles
              </h2>
            </div>
            <div className="font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
              {overlapSkills.length} overlapping core/important skills
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Role A</label>
              <select
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                {SEEDED_CAREER_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Role B</label>
              <select
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                {SEEDED_CAREER_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[roleA, roleB].map((role) => (
              <div key={role.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{role.name}</h3>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {role.requiredSkills.length + role.importantSkills.length} key skills
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {role.requiredSkills.map((s) => (
                    <div key={s.name} className="py-2 flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-200">{s.name}</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        Target {s.targetProficiency}/5 · Wt {s.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {overlapSkills.length > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <span className="font-semibold text-slate-900 dark:text-white">Shared Skills: </span>
              {overlapSkills.join(' · ')}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />

      {selectedRole && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-w-2xl w-full max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedRole.domain} · {selectedRole.seniorityLevel}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedRole.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRole(null)}
                aria-label="Close modal"
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedRole.description}
            </p>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                Required & Important Skills
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {[...selectedRole.requiredSkills, ...selectedRole.importantSkills].map((s) => (
                  <div key={s.name} className="px-3.5 py-2 flex items-center justify-between text-xs">
                    <span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                      <span className="text-slate-400 ml-2">({s.tier})</span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      Lvl {s.targetProficiency}/5 · Weight {s.weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                Career Progression Track
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                {selectedRole.careerProgression.join(' → ')}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Ready to score yourself?
              </span>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Run Personal Gap Analysis
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
