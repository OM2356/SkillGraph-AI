'use client';

import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { CardsSkeleton } from '@/components/Skeleton';
import { useAppToast } from '@/components/Providers';
import { SEEDED_CAREER_ROLES } from '@/shared/catalogData';
import type { UserProfile } from '@/shared/types';

export default function ProfilePage() {
  const { notify } = useAppToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((json) => {
        if (json.profile) setProfile(json.profile);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName,
          college: profile.college,
          degree: profile.degree,
          currentYear: profile.currentYear,
          graduationYear: profile.graduationYear,
          country: profile.country,
          targetRoleId: profile.targetRoleId,
          desiredIndustry: profile.desiredIndustry,
          jobGoal: profile.jobGoal,
          hoursPerWeek: profile.hoursPerWeek,
          learningStyle: profile.learningStyle,
          budgetPreference: profile.budgetPreference,
          learningPace: profile.learningPace,
          onboardingCompleted: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update profile');
      setProfile(json.profile);
      notify('Profile updated successfully.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Profile" subtitle="Manage your education, target career path, and learning preferences.">
      {loading ? (
        <CardsSkeleton count={2} />
      ) : profile ? (
        <form
          onSubmit={handleSave}
          className="max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Full Name</label>
              <input
                type="text"
                required
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email (Account)</label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">College / University</label>
              <input
                type="text"
                value={profile.college || ''}
                onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Degree / Branch</label>
              <input
                type="text"
                value={profile.degree || ''}
                onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Current Year / Experience Stage</label>
              <input
                type="text"
                value={profile.currentYear || ''}
                onChange={(e) => setProfile({ ...profile, currentYear: e.target.value })}
                placeholder="e.g. Junior, Senior, Career Switcher"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Graduation Year</label>
              <input
                type="text"
                value={profile.graduationYear || ''}
                onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Target Career Role</label>
              <select
                value={profile.targetRoleId || ''}
                onChange={(e) => setProfile({ ...profile, targetRoleId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              >
                <option value="">Select role...</option>
                {SEEDED_CAREER_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Available Study Hours / Week</label>
              <input
                type="number"
                min={1}
                max={80}
                value={profile.hoursPerWeek || 10}
                onChange={(e) => setProfile({ ...profile, hoursPerWeek: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Career / Job Goal</label>
              <input
                type="text"
                value={profile.jobGoal || ''}
                onChange={(e) => setProfile({ ...profile, jobGoal: e.target.value })}
                placeholder="e.g. Summer 2027 SWE Internship"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Preferred Learning Style</label>
              <input
                type="text"
                value={profile.learningStyle || ''}
                onChange={(e) => setProfile({ ...profile, learningStyle: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      ) : null}
    </AppShell>
  );
}
