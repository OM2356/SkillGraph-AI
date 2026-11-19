import { useEffect, useState } from 'react';
import { Activity, Plus, ShieldCheck, Users } from 'lucide-react';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { checkApiHealth } from '../services/apiClient';
import {
  fetchAdminActivity,
  fetchAllUsersForAdmin,
  upsertCustomCareerRole,
} from '../services/firestoreService';
import { SKILL_CATEGORIES, type SkillCategory, type UserProfile } from '../shared/types';

export function AdminPage() {
  const { user, isAdmin, careerRoles } = useApp();
  const { notify } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activity, setActivity] = useState<Array<Record<string, unknown>>>([]);
  const [health, setHealth] = useState<{ status: string; geminiConfigured: boolean; timestamp: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [newRole, setNewRole] = useState({
    id: '',
    name: '',
    domain: 'Engineering',
    seniorityLevel: 'Junior / Early Career' as const,
    description: '',
    skill1: 'TypeScript',
    cat1: 'Programming Languages' as SkillCategory,
    skill2: 'System Design',
    cat2: 'Backend' as SkillCategory,
  });

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([fetchAllUsersForAdmin(), fetchAdminActivity(), checkApiHealth()])
      .then(([u, act, h]) => {
        setUsers(u);
        setActivity(act);
        setHealth(h);
      })
      .catch((err) => notify(err instanceof Error ? err.message : 'Admin fetch failed.', 'error'))
      .finally(() => setLoading(false));
  }, [isAdmin, notify]);

  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-red-600 mb-1">Access Restricted</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Administrator privileges are required to view this console.
        </p>
      </div>
    );
  }

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newRole.name.trim()) return;
    const slug = (newRole.id.trim() || newRole.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).slice(0, 80);
    try {
      await upsertCustomCareerRole(user.uid, user.email || '', {
        id: slug,
        name: newRole.name.trim(),
        domain: newRole.domain.trim(),
        seniorityLevel: newRole.seniorityLevel,
        description: newRole.description.trim() || `Custom career benchmark for ${newRole.name}.`,
        isPublished: true,
        requiredSkills: [
          {
            name: newRole.skill1.trim(),
            category: newRole.cat1,
            targetProficiency: 4,
            weight: 9,
            tier: 'required',
            estimatedBaseHours: 35,
          },
          {
            name: newRole.skill2.trim(),
            category: newRole.cat2,
            targetProficiency: 3,
            weight: 8,
            tier: 'required',
            estimatedBaseHours: 25,
          },
        ],
        importantSkills: [],
        optionalSkills: [],
        exampleResponsibilities: ['Deliver production-grade features aligned with role standards.'],
        careerProgression: ['Junior', 'Mid-Level', 'Senior'],
      });
      notify(`Published custom role "${newRole.name}" to Firestore catalog.`, 'success');
      setNewRole({ ...newRole, id: '', name: '', description: '' });
      const act = await fetchAdminActivity();
      setActivity(act);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to create role.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Health & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono tabular-nums">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
            <Users className="w-4 h-4 text-indigo-600" /> Registered Users
          </div>
          <div className="text-2xl font-bold mt-1">{loading ? '...' : users.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Published Roles
          </div>
          <div className="text-2xl font-bold mt-1">{careerRoles.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
            <Activity className="w-4 h-4 text-indigo-600" /> API & Gemini Health
          </div>
          <div className="text-sm font-semibold mt-2 text-emerald-600">
            {health ? `${health.status.toUpperCase()} · Gemini ${health.geminiConfigured ? 'Ready' : 'Missing Key'}` : 'Checking...'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Custom Career Role */}
        <form
          onSubmit={handleAddRole}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-base font-semibold">Add Custom Career Role</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Role Name</label>
              <input
                required
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="e.g. Site Reliability Engineer"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Domain</label>
              <input
                required
                value={newRole.domain}
                onChange={(e) => setNewRole({ ...newRole, domain: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Description</label>
              <textarea
                rows={2}
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Core Skill #1</label>
              <input
                value={newRole.skill1}
                onChange={(e) => setNewRole({ ...newRole, skill1: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={newRole.cat1}
                onChange={(e) => setNewRole({ ...newRole, cat1: e.target.value as SkillCategory })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {SKILL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Publish Career Role
          </button>
        </form>

        {/* Users Directory */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4">Users Directory</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {users.map((u) => (
              <div key={u.uid} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{u.displayName}</div>
                  <div className="text-slate-500">{u.email}</div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-indigo-600 dark:text-indigo-400">{u.role}</span>
                  <div className="text-[11px] text-slate-500">{u.targetRoleName || 'Unset'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-semibold mb-3">Administrative Audit Log</h3>
        {activity.length === 0 ? (
          <p className="text-xs text-slate-500">No admin actions recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {activity.map((item) => (
              <div key={String(item.id)} className="py-2 flex items-center justify-between">
                <span>
                  <span className="font-mono font-semibold">{String(item.action)}</span> — {String(item.details)}
                </span>
                <span className="text-slate-500">{String(item.adminEmail)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
