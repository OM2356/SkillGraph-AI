import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { updateUserProfile } from '../services/firestoreService';

export function ProfilePage() {
  const { user, profile, careerRoles } = useApp();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    displayName: '',
    college: '',
    degree: '',
    currentYear: '',
    graduationYear: '',
    country: '',
    targetRoleId: 'sde',
    desiredIndustry: '',
    jobGoal: '',
    targetCompanies: '',
    hoursPerWeek: 12,
    learningStyle: 'Hands-on projects',
    budgetPreference: 'free_preferred' as 'free_only' | 'free_preferred' | 'paid_ok',
    preferredLanguage: 'English',
    learningPace: 'steady' as 'steady' | 'intensive' | 'flexible',
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      displayName: profile.displayName || '',
      college: profile.college || '',
      degree: profile.degree || '',
      currentYear: profile.currentYear || '',
      graduationYear: profile.graduationYear || '',
      country: profile.country || '',
      targetRoleId: profile.targetRoleId || 'sde',
      desiredIndustry: profile.desiredIndustry || '',
      jobGoal: profile.jobGoal || '',
      targetCompanies: (profile.targetCompanies || []).join(', '),
      hoursPerWeek: profile.hoursPerWeek || 12,
      learningStyle: profile.learningStyle || 'Hands-on projects',
      budgetPreference: profile.budgetPreference || 'free_preferred',
      preferredLanguage: profile.preferredLanguage || 'English',
      learningPace: profile.learningPace || 'steady',
    });
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.displayName.trim()) {
      notify('Display name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const role = careerRoles.find((r) => r.id === form.targetRoleId) || careerRoles[0];
      await updateUserProfile(user.uid, {
        displayName: form.displayName.trim(),
        college: form.college.trim(),
        degree: form.degree.trim(),
        currentYear: form.currentYear.trim(),
        graduationYear: form.graduationYear.trim(),
        country: form.country.trim(),
        targetRoleId: role.id,
        targetRoleName: role.name,
        careerDomain: role.domain,
        desiredIndustry: form.desiredIndustry.trim(),
        jobGoal: form.jobGoal.trim(),
        targetCompanies: form.targetCompanies
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 10),
        hoursPerWeek: Number(form.hoursPerWeek),
        learningStyle: form.learningStyle,
        budgetPreference: form.budgetPreference,
        preferredLanguage: form.preferredLanguage,
        learningPace: form.learningPace,
        onboardingCompleted: true,
      });
      notify('Profile updated successfully.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-4xl space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold">Candidate & Academic Profile</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Account email: {profile?.email || user?.email} · Role: {profile?.role || 'user'}
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Full Name</label>
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">College / University</label>
            <input
              value={form.college}
              onChange={(e) => setForm({ ...form, college: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Degree / Major</label>
            <input
              value={form.degree}
              onChange={(e) => setForm({ ...form, degree: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Current Academic / Career Stage</label>
            <input
              value={form.currentYear}
              onChange={(e) => setForm({ ...form, currentYear: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Graduation Year</label>
            <input
              value={form.graduationYear}
              onChange={(e) => setForm({ ...form, graduationYear: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Country</label>
            <input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-semibold">Career Target & Learning Preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1.5">Target Career Role</label>
            <select
              value={form.targetRoleId}
              onChange={(e) => setForm({ ...form, targetRoleId: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {careerRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.domain})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Career Goal</label>
            <input
              value={form.jobGoal}
              onChange={(e) => setForm({ ...form, jobGoal: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Desired Industry</label>
            <input
              value={form.desiredIndustry}
              onChange={(e) => setForm({ ...form, desiredIndustry: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1.5">Target Companies (comma-separated)</label>
            <input
              value={form.targetCompanies}
              onChange={(e) => setForm({ ...form, targetCompanies: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Hours / Week</label>
            <input
              type="number"
              min={1}
              max={80}
              value={form.hoursPerWeek}
              onChange={(e) => setForm({ ...form, hoursPerWeek: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Resource Budget</label>
            <select
              value={form.budgetPreference}
              onChange={(e) =>
                setForm({ ...form, budgetPreference: e.target.value as typeof form.budgetPreference })
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="free_only">Free resources only</option>
              <option value="free_preferred">Free preferred, optional paid</option>
              <option value="paid_ok">Open to paid courses</option>
            </select>
          </div>
        </div>
      </div>
    </form>
  );
}
