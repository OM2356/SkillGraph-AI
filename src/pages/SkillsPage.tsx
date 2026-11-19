import { useEffect, useMemo, useState } from 'react';
import { Edit3, LayoutGrid, Plus, Search, Table2, Trash2, X } from 'lucide-react';
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
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { deleteUserSkill, upsertUserSkill } from '../services/firestoreService';
import {
  PROFICIENCY_LABELS,
  SKILL_CATEGORIES,
  type ProficiencyLevel,
  type SkillCategory,
  type UserSkill,
} from '../shared/types';

export function SkillsPage() {
  const { user, skills, projects } = useApp();
  const { notify } = useToast();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserSkill | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserSkill | null>(null);

  const [form, setForm] = useState({
    name: '',
    category: 'Programming Languages' as SkillCategory,
    proficiency: 3 as ProficiencyLevel,
    experienceMonths: 6,
    lastPracticed: new Date().toISOString().slice(0, 10),
    confidence: 3 as ProficiencyLevel,
    evidence: '',
    linkedProjectId: '',
    currentlyLearning: false,
  });

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      if (search.trim() && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [skills, categoryFilter, search]);

  const chartData = useMemo(
    () =>
      filtered.slice(0, 12).map((s) => ({
        name: s.name.length > 14 ? `${s.name.slice(0, 12)}..` : s.name,
        proficiency: s.proficiency,
        confidence: s.confidence ?? s.proficiency,
      })),
    [filtered]
  );

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      category: 'Programming Languages',
      proficiency: 3,
      experienceMonths: 6,
      lastPracticed: new Date().toISOString().slice(0, 10),
      confidence: 3,
      evidence: '',
      linkedProjectId: '',
      currentlyLearning: false,
    });
    setModalOpen(true);
  };

  const openEdit = (skill: UserSkill) => {
    setEditing(skill);
    setForm({
      name: skill.name,
      category: (SKILL_CATEGORIES.includes(skill.category as SkillCategory)
        ? skill.category
        : 'Programming Languages') as SkillCategory,
      proficiency: skill.proficiency,
      experienceMonths: skill.experienceMonths ?? 0,
      lastPracticed: skill.lastPracticed || new Date().toISOString().slice(0, 10),
      confidence: skill.confidence ?? skill.proficiency,
      evidence: skill.evidence || '',
      linkedProjectId: skill.linkedProjectId || '',
      currentlyLearning: skill.currentlyLearning,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.name.trim()) {
      notify('Skill name is required.', 'error');
      return;
    }
    try {
      await upsertUserSkill(user.uid, {
        id: editing?.id,
        name: form.name.trim(),
        category: form.category,
        proficiency: form.proficiency,
        experienceMonths: form.experienceMonths,
        lastPracticed: form.lastPracticed,
        confidence: form.confidence,
        evidence: form.evidence.trim(),
        linkedProjectId: form.linkedProjectId,
        currentlyLearning: form.currentlyLearning,
      });
      notify(editing ? 'Skill updated.' : 'Skill added to your inventory.', 'success');
      setModalOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save skill.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!user || !confirmDelete) return;
    try {
      await deleteUserSkill(user.uid, confirmDelete.id);
      notify(`Removed ${confirmDelete.name}.`, 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to remove skill.', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              aria-label="Search skills"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="All">All Categories ({skills.length})</option>
            {SKILL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${
                viewMode === 'cards' ? 'bg-white dark:bg-slate-800 font-medium shadow-xs' : 'text-slate-500'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-800 font-medium shadow-xs' : 'text-slate-500'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> Table
            </button>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        </div>
      </div>

      {/* Proficiency Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Skill Proficiency & Confidence Overview</h3>
            <span className="text-xs text-slate-500 font-mono">1 = Beginner · 5 = Expert</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="proficiency" name="Proficiency" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="confidence" name="Confidence" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Skill Cards or Table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            No skills found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Add your programming languages, frameworks, tools, and soft skills to power accurate gap scoring.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Add First Skill
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill) => {
            const linkedProj = projects.find((p) => p.id === skill.linkedProjectId);
            return (
              <div
                key={skill.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {skill.category}
                        {skill.currentlyLearning ? ' · Learning' : ''}
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                        {skill.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(skill)}
                        aria-label={`Edit ${skill.name}`}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(skill)}
                        aria-label={`Delete ${skill.name}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300">
                        {PROFICIENCY_LABELS[skill.proficiency]}
                      </span>
                      <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                        {skill.proficiency} / 5
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${(skill.proficiency / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {skill.evidence && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                      Evidence: {skill.evidence}
                    </p>
                  )}
                  {linkedProj && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                      Linked project: {linkedProj.title}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span>{skill.experienceMonths ?? 0} mos exp</span>
                  <span>Practiced: {skill.lastPracticed || 'Recent'}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Skill</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Proficiency</th>
                  <th className="py-3 px-4 font-semibold text-right">Experience</th>
                  <th className="py-3 px-4 font-semibold">Last Practiced</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((skill) => (
                  <tr key={skill.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/60">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{skill.name}</td>
                    <td className="py-3 px-4 text-slate-500">{skill.category}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right">
                      {skill.proficiency}/5 ({PROFICIENCY_LABELS[skill.proficiency]})
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right">{skill.experienceMonths ?? 0}m</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                      {skill.lastPracticed || 'Recent'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {skill.currentlyLearning ? 'Learning' : 'Active'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(skill)}
                          aria-label={`Edit ${skill.name}`}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(skill)}
                          aria-label={`Delete ${skill.name}`}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Skill Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <form
            onSubmit={handleSave}
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{editing ? 'Edit Skill' : 'Add New Skill'}</h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Skill Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. TypeScript, PostgreSQL, Docker"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as SkillCategory })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {SKILL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Proficiency (1–5)</label>
                <select
                  value={form.proficiency}
                  onChange={(e) => setForm({ ...form, proficiency: Number(e.target.value) as ProficiencyLevel })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl} — {PROFICIENCY_LABELS[lvl as ProficiencyLevel]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Experience (Months)</label>
                <input
                  type="number"
                  min={0}
                  max={600}
                  value={form.experienceMonths}
                  onChange={(e) => setForm({ ...form, experienceMonths: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Confidence (1–5)</label>
                <select
                  value={form.confidence}
                  onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) as ProficiencyLevel })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl} — {PROFICIENCY_LABELS[lvl as ProficiencyLevel]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Last Practiced</label>
                <input
                  type="date"
                  value={form.lastPracticed}
                  onChange={(e) => setForm({ ...form, lastPracticed: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Link to Project</label>
                <select
                  value={form.linkedProjectId}
                  onChange={(e) => setForm({ ...form, linkedProjectId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Evidence / Notes</label>
                <input
                  value={form.evidence}
                  onChange={(e) => setForm({ ...form, evidence: e.target.value })}
                  placeholder="e.g. Built REST backend for university project"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.currentlyLearning}
                  onChange={(e) => setForm({ ...form, currentlyLearning: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Mark as currently learning
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {editing ? 'Save Skill' : 'Add Skill'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete Skill"
        description={`Remove "${confirmDelete?.name}" from your skill inventory? You can always re-add it later.`}
        confirmLabel="Delete Skill"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
