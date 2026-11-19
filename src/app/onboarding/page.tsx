'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAppToast } from '@/components/Providers';
import { SEEDED_CAREER_ROLES } from '@/shared/catalogData';
import { SKILL_CATEGORIES, type ProficiencyLevel } from '@/shared/types';

export default function OnboardingPage() {
  const router = useRouter();
  const { notify } = useAppToast();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('');
  const [graduationYear, setGraduationYear] = useState('2027');
  const [targetRoleId, setTargetRoleId] = useState(SEEDED_CAREER_ROLES[1].id);
  const [hoursPerWeek, setHoursPerWeek] = useState(12);
  const [learningStyle, setLearningStyle] = useState('Hands-on projects & official docs');
  const [budgetPreference, setBudgetPreference] = useState<'free_only' | 'free_preferred' | 'paid_ok'>('free_preferred');
  const [starterSkills, setStarterSkills] = useState<Array<{ name: string; category: string; proficiency: ProficiencyLevel }>>([
    { name: 'Git', category: 'Tools', proficiency: 3 },
  ]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<string>(SKILL_CATEGORIES[0]);
  const [newSkillProf, setNewSkillProf] = useState<ProficiencyLevel>(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.profile) {
          setDisplayName(json.profile.displayName || '');
          setCollege(json.profile.college || '');
          setDegree(json.profile.degree || '');
          if (json.profile.targetRoleId) setTargetRoleId(json.profile.targetRoleId);
          if (json.profile.hoursPerWeek) setHoursPerWeek(json.profile.hoursPerWeek);
        }
      })
      .catch(() => {});
  }, []);

  function addStarterSkill() {
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    if (starterSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    setStarterSkills((prev) => [
      ...prev,
      { name: trimmed, category: newSkillCategory, proficiency: newSkillProf },
    ]);
    setNewSkillName('');
  }

  async function finishOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const profileRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim() || 'Student',
          college: college.trim(),
          degree: degree.trim(),
          graduationYear,
          targetRoleId,
          hoursPerWeek,
          learningStyle,
          budgetPreference,
          onboardingCompleted: true,
        }),
      });
      if (!profileRes.ok) {
        const err = await profileRes.json();
        throw new Error(err.error || 'Failed to save profile');
      }

      for (const s of starterSkills) {
        await fetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(s),
        });
      }

      notify('Onboarding saved! Let’s run your first gap diagnostic.', 'success');
      router.push('/analysis');
      router.refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to save onboarding.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Career Onboarding"
      subtitle="Configure your academic background, target role, and baseline skills."
    >
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-4">
          <span>Step {step} of 3</span>
          <span>
            {step === 1 ? 'Profile & Study Pace' : step === 2 ? 'Target Career Role' : 'Baseline Skills'}
          </span>
        </div>

        <form onSubmit={finishOnboarding} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">University / College</label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="State University"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Degree / Major</label>
                  <input
                    type="text"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="B.S. Computer Science"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Graduation Year</label>
                  <input
                    type="text"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Weekly Study Hours</label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Primary Target Career Role</label>
                <select
                  value={targetRoleId}
                  onChange={(e) => setTargetRoleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                >
                  {SEEDED_CAREER_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.domain}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Preferred Learning Style</label>
                <select
                  value={learningStyle}
                  onChange={(e) => setLearningStyle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                >
                  <option>Hands-on projects & official docs</option>
                  <option>Structured video courses + exercises</option>
                  <option>Reading documentation & building tools</option>
                  <option>Problem sets & spaced repetition</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Resource Budget</label>
                <select
                  value={budgetPreference}
                  onChange={(e) => setBudgetPreference(e.target.value as typeof budgetPreference)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="free_only">Free resources only</option>
                  <option value="free_preferred">Prefer free, occasional paid OK</option>
                  <option value="paid_ok">Open to paid courses & books</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Add a few skills you already know (you can add or edit all skills anytime on the Skills page).
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Skill name (e.g. Python, SQL, React)"
                  className="flex-1 min-w-[160px] px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                >
                  {SKILL_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={newSkillProf}
                  onChange={(e) => setNewSkillProf(Number(e.target.value) as ProficiencyLevel)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                >
                  <option value={1}>1 - Beginner</option>
                  <option value={2}>2 - Basic</option>
                  <option value={3}>3 - Intermediate</option>
                  <option value={4}>4 - Advanced</option>
                  <option value={5}>5 - Expert</option>
                </select>
                <button
                  type="button"
                  onClick={addStarterSkill}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-700"
                >
                  Add
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {starterSkills.map((s) => (
                  <div key={s.name} className="px-3.5 py-2 flex items-center justify-between text-xs">
                    <span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{s.name}</span>
                      <span className="text-slate-400 ml-2">{s.category}</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        Lvl {s.proficiency}/5
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setStarterSkills((prev) => prev.filter((item) => item.name !== s.name))
                        }
                        className="text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {saving ? 'Saving Profile...' : 'Finish & Run Analysis'}
              </button>
            )}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
