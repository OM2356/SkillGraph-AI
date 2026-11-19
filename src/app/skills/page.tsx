'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CardsSkeleton } from '@/components/Skeleton';
import { useAppToast } from '@/components/Providers';
import { PROFICIENCY_LABELS, SKILL_CATEGORIES, type ProficiencyLevel, type UserSkill } from '@/shared/types';

export default function SkillsPage() {
  const { notify } = useAppToast();
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(SKILL_CATEGORIES[0]);
  const [proficiency, setProficiency] = useState<ProficiencyLevel>(3);
  const [experienceMonths, setExperienceMonths] = useState(6);
  const [evidence, setEvidence] = useState('');
  const [currentlyLearning, setCurrentlyLearning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<UserSkill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserSkill | null>(null);

  async function loadSkills() {
    setLoading(true);
    try {
      const res = await fetch('/api/skills');
      const json = await res.json();
      if (res.ok) setSkills(json.skills || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSkills();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return skills.filter((s) => {
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    });
  }, [skills, search, categoryFilter]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          proficiency,
          experienceMonths,
          evidence: evidence.trim(),
          currentlyLearning,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add skill');
      setSkills((prev) => [json.skill, ...prev]);
      setName('');
      setEvidence('');
      setCurrentlyLearning(false);
      notify(`Added "${json.skill.name}" to your skill inventory.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to add skill.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      const res = await fetch(`/api/skills/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editing.name,
          category: editing.category,
          proficiency: editing.proficiency,
          experienceMonths: editing.experienceMonths,
          evidence: editing.evidence,
          currentlyLearning: editing.currentlyLearning,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update skill');
      setSkills((prev) => prev.map((s) => (s.id === json.skill.id ? json.skill : s)));
      setEditing(null);
      notify('Skill updated.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update skill.', 'error');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/skills/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSkills((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      notify(`Removed "${deleteTarget.name}".`, 'info');
    } catch {
      notify('Failed to remove skill.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <AppShell
      title="My Skills"
      subtitle="Maintain accurate 1–5 proficiency levels and proof evidence for deterministic scoring."
    >
      <div className="space-y-6">
        {/* Add Skill Form */}
        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add a Skill</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Skill name (e.g. TypeScript, SQL)"
              className="lg:col-span-2 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              {SKILL_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={proficiency}
              onChange={(e) => setProficiency(Number(e.target.value) as ProficiencyLevel)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              {([1, 2, 3, 4, 5] as ProficiencyLevel[]).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl} — {PROFICIENCY_LABELS[lvl]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={240}
              value={experienceMonths}
              onChange={(e) => setExperienceMonths(Number(e.target.value))}
              placeholder="Months"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-4">
              <input
                type="text"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Optional evidence (e.g. Built REST API with Express & Postgres)"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={currentlyLearning}
                  onChange={(e) => setCurrentlyLearning(e.target.checked)}
                />
                Currently learning
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {submitting ? 'Adding...' : 'Add Skill'}
            </button>
          </div>
        </form>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter skills..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <option value="All">All Categories</option>
            {SKILL_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Skills Grid */}
        {loading ? (
          <CardsSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500">
            No skills found matching your filter. Add your first skill above.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((skill) => (
                <div
                  key={skill.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {skill.name}
                      </span>
                      <span className="text-xs text-slate-500">{skill.category}</span>
                      {skill.currentlyLearning && (
                        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                          · Learning
                        </span>
                      )}
                    </div>
                    {skill.evidence && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {skill.evidence}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right font-mono tabular-nums text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {skill.proficiency}/5 ({PROFICIENCY_LABELS[skill.proficiency]})
                      </span>
                      <span className="text-slate-400 ml-2">{skill.experienceMonths || 0}m</span>
                    </div>
                    <button
                      onClick={() => setEditing(skill)}
                      aria-label={`Edit ${skill.name}`}
                      className="p-1.5 text-slate-400 hover:text-indigo-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(skill)}
                      aria-label={`Delete ${skill.name}`}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleUpdate}
            className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Edit Skill: {editing.name}</h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Proficiency</label>
              <select
                value={editing.proficiency}
                onChange={(e) =>
                  setEditing({ ...editing, proficiency: Number(e.target.value) as ProficiencyLevel })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              >
                {([1, 2, 3, 4, 5] as ProficiencyLevel[]).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl} — {PROFICIENCY_LABELS[lvl]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Experience (Months)</label>
              <input
                type="number"
                min={0}
                value={editing.experienceMonths || 0}
                onChange={(e) => setEditing({ ...editing, experienceMonths: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Evidence</label>
              <input
                type="text"
                value={editing.evidence || ''}
                onChange={(e) => setEditing({ ...editing, evidence: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={editing.currentlyLearning}
                onChange={(e) => setEditing({ ...editing, currentlyLearning: e.target.checked })}
              />
              Currently learning
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Skill?"
        description={`Remove "${deleteTarget?.name}" from your skill inventory? Future gap analyses will reflect this change.`}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
