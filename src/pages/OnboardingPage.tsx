import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { AppRoute } from '../layouts/AppShell';
import {
  createNotification,
  updateUserProfile,
  upsertUserProject,
  upsertUserSkill,
} from '../services/firestoreService';
import {
  PROFICIENCY_LABELS,
  SKILL_CATEGORIES,
  type ProficiencyLevel,
  type SkillCategory,
} from '../shared/types';

interface OnboardingPageProps {
  onNavigate: (route: AppRoute) => void;
}

interface DraftSkill {
  name: string;
  category: SkillCategory;
  proficiency: ProficiencyLevel;
  experienceMonths: number;
}

const SUGGESTED_SKILLS: Array<{ name: string; category: SkillCategory }> = [
  { name: 'JavaScript', category: 'Programming Languages' },
  { name: 'TypeScript', category: 'Programming Languages' },
  { name: 'Python', category: 'Programming Languages' },
  { name: 'Java', category: 'Programming Languages' },
  { name: 'C++', category: 'Programming Languages' },
  { name: 'Data Structures & Algorithms', category: 'Programming Languages' },
  { name: 'React', category: 'Frontend' },
  { name: 'HTML & CSS', category: 'Frontend' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'REST APIs', category: 'Backend' },
  { name: 'SQL', category: 'Database' },
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'Git', category: 'Tools' },
  { name: 'Docker', category: 'DevOps' },
  { name: 'Problem Solving', category: 'Soft Skills' },
];

export function OnboardingPage({ onNavigate }: OnboardingPageProps) {
  const { user, profile, careerRoles, skills } = useApp();
  const { notify } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Personal
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || '');
  const [college, setCollege] = useState(profile?.college || '');
  const [degree, setDegree] = useState(profile?.degree || 'B.Tech / B.S. Computer Science');
  const [currentYear, setCurrentYear] = useState(profile?.currentYear || '3rd Year');
  const [graduationYear, setGraduationYear] = useState(profile?.graduationYear || '2027');
  const [country, setCountry] = useState(profile?.country || 'India');

  // Step 2: Career Interests
  const [targetRoleId, setTargetRoleId] = useState(profile?.targetRoleId || 'sde');
  const [targetCompanies, setTargetCompanies] = useState((profile?.targetCompanies || []).join(', '));
  const [desiredIndustry, setDesiredIndustry] = useState(profile?.desiredIndustry || 'Software & Cloud');
  const [jobGoal, setJobGoal] = useState(profile?.jobGoal || 'Full-Time Software Role');

  // Step 3 & 4: Skills
  const [draftSkills, setDraftSkills] = useState<DraftSkill[]>(() =>
    skills.length > 0
      ? skills.map((s) => ({
          name: s.name,
          category: (SKILL_CATEGORIES.includes(s.category as SkillCategory)
            ? s.category
            : 'Programming Languages') as SkillCategory,
          proficiency: s.proficiency,
          experienceMonths: s.experienceMonths || 6,
        }))
      : [
          { name: 'Python', category: 'Programming Languages', proficiency: 3, experienceMonths: 12 },
          { name: 'Git', category: 'Tools', proficiency: 3, experienceMonths: 10 },
          { name: 'SQL', category: 'Database', proficiency: 2, experienceMonths: 6 },
        ]
  );
  const [customSkillName, setCustomSkillName] = useState('');
  const [customSkillCat, setCustomSkillCat] = useState<SkillCategory>('Programming Languages');

  // Step 5: Learning Preferences
  const [hoursPerWeek, setHoursPerWeek] = useState(profile?.hoursPerWeek || 12);
  const [learningStyle, setLearningStyle] = useState(profile?.learningStyle || 'Hands-on projects');
  const [budgetPreference, setBudgetPreference] = useState<'free_only' | 'free_preferred' | 'paid_ok'>(
    profile?.budgetPreference || 'free_preferred'
  );
  const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferredLanguage || 'English');
  const [learningPace, setLearningPace] = useState<'steady' | 'intensive' | 'flexible'>(
    profile?.learningPace || 'steady'
  );

  // Step 6: Initial Project
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projTech, setProjTech] = useState('');
  const [projGithub, setProjGithub] = useState('');
  const [projRole, setProjRole] = useState('Solo Developer');

  const selectedRole = careerRoles.find((r) => r.id === targetRoleId) || careerRoles[0];

  const toggleSuggestedSkill = (item: { name: string; category: SkillCategory }) => {
    setDraftSkills((prev) => {
      const exists = prev.some((s) => s.name.toLowerCase() === item.name.toLowerCase());
      if (exists) {
        return prev.filter((s) => s.name.toLowerCase() !== item.name.toLowerCase());
      }
      return [...prev, { name: item.name, category: item.category, proficiency: 2, experienceMonths: 6 }];
    });
  };

  const addCustomSkill = () => {
    const trimmed = customSkillName.trim();
    if (!trimmed) return;
    if (draftSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      notify('Skill already added to your list.', 'info');
      return;
    }
    setDraftSkills((prev) => [
      ...prev,
      { name: trimmed, category: customSkillCat, proficiency: 2, experienceMonths: 3 },
    ]);
    setCustomSkillName('');
  };

  const handleFinish = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      notify('Please provide your full name in Step 1.', 'error');
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        college: college.trim(),
        degree: degree.trim(),
        currentYear,
        graduationYear,
        country: country.trim(),
        targetRoleId: selectedRole.id,
        targetRoleName: selectedRole.name,
        careerDomain: selectedRole.domain,
        targetCompanies: targetCompanies
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 10),
        desiredIndustry: desiredIndustry.trim(),
        jobGoal: jobGoal.trim(),
        hoursPerWeek,
        learningStyle,
        budgetPreference,
        preferredLanguage,
        learningPace,
        onboardingCompleted: true,
      });

      // Save draft skills if they aren't already saved
      for (const ds of draftSkills) {
        const existing = skills.find((s) => s.name.toLowerCase() === ds.name.toLowerCase());
        await upsertUserSkill(user.uid, {
          id: existing?.id,
          name: ds.name,
          category: ds.category,
          proficiency: ds.proficiency,
          experienceMonths: ds.experienceMonths,
          currentlyLearning: ds.proficiency < 3,
        });
      }

      if (projTitle.trim() && projDesc.trim()) {
        const stack = projTech
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        await upsertUserProject(user.uid, {
          title: projTitle.trim(),
          description: projDesc.trim(),
          techStack: stack,
          skillsDemonstrated: stack,
          githubUrl: projGithub.trim(),
          status: 'completed',
          userRole: projRole.trim() || 'Developer',
        });
      }

      await createNotification(
        user.uid,
        'Profile Onboarding Complete',
        `Your target role is set to ${selectedRole.name}. Run your first skill gap analysis next!`,
        'system'
      );

      notify('Onboarding profile saved to Firestore!', 'success');
      onNavigate('analysis');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save onboarding data.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = [
    'Personal Info',
    'Career Goal',
    'Current Skills',
    'Proficiency',
    'Preferences',
    'Project',
    'Review',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
              Step {step} of 7 · {stepLabels[step - 1]}
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              Personalize Your Career Graph
            </h2>
          </div>
          <span className="font-mono tabular-nums text-xs text-slate-500">
            {Math.round((step / 7) * 100)}% complete
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {stepLabels.map((lbl, idx) => {
            const num = idx + 1;
            return (
              <button
                key={lbl}
                onClick={() => setStep(num)}
                title={lbl}
                className={`h-2 rounded-full transition-colors ${
                  num <= step ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Step Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2">01. Personal & Academic Background</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Full Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">College / University</label>
                <input
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Pune Institute of Computer Technology"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Degree & Major</label>
                <input
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Current Year / Status</label>
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>Final Year</option>
                  <option>Fresh Graduate</option>
                  <option>Working Professional</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Graduation Year</label>
                <input
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Country</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2">02. Target Career Interests</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1.5">Target Career Role</label>
                <select
                  value={targetRoleId}
                  onChange={(e) => setTargetRoleId(e.target.value)}
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
                <label className="block text-xs font-medium mb-1.5">Goal Type</label>
                <select
                  value={jobGoal}
                  onChange={(e) => setJobGoal(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option>Internship</option>
                  <option>Full-Time Software Role</option>
                  <option>Career Switch</option>
                  <option>Freelance / Product Builder</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Desired Industry</label>
                <input
                  value={desiredIndustry}
                  onChange={(e) => setDesiredIndustry(e.target.value)}
                  placeholder="e.g. FinTech, SaaS, AI Infrastructure"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1.5">Target Companies (comma-separated)</label>
                <input
                  value={targetCompanies}
                  onChange={(e) => setTargetCompanies(e.target.value)}
                  placeholder="e.g. Stripe, Atlassian, Linear, Startups"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">03. Select Your Current Skills</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click common skills below or add your own across programming languages, frameworks, databases, tools, and soft skills.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SKILLS.map((item) => {
                const selected = draftSkills.some((s) => s.name.toLowerCase() === item.name.toLowerCase());
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => toggleSuggestedSkill(item)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      selected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <input
                value={customSkillName}
                onChange={(e) => setCustomSkillName(e.target.value)}
                placeholder="Add another skill (e.g. Spring Boot, PyTorch, Kubernetes)"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <select
                value={customSkillCat}
                onChange={(e) => setCustomSkillCat(e.target.value as SkillCategory)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {SKILL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addCustomSkill}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white dark:bg-indigo-600"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">04. Rate Proficiency & Experience</h3>
            {draftSkills.length === 0 ? (
              <p className="text-sm text-slate-500">Go back to Step 3 to add at least one skill.</p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {draftSkills.map((ds, idx) => (
                  <div key={ds.name} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{ds.name}</div>
                      <div className="text-xs text-slate-500">{ds.category}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={ds.proficiency}
                        onChange={(e) => {
                          const val = Number(e.target.value) as ProficiencyLevel;
                          setDraftSkills((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, proficiency: val } : item))
                          );
                        }}
                        className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl} — {PROFICIENCY_LABELS[lvl as ProficiencyLevel]}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5 text-xs">
                        <input
                          type="number"
                          min={0}
                          max={240}
                          value={ds.experienceMonths}
                          onChange={(e) => {
                            const months = Math.max(0, Number(e.target.value));
                            setDraftSkills((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, experienceMonths: months } : item))
                            );
                          }}
                          className="w-16 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
                        />
                        <span className="text-slate-500">mos</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftSkills((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`Remove ${ds.name}`}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">05. Learning Preferences</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Hours Available per Week</label>
                <input
                  type="number"
                  min={2}
                  max={70}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Math.max(2, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Preferred Learning Style</label>
                <select
                  value={learningStyle}
                  onChange={(e) => setLearningStyle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option>Hands-on projects</option>
                  <option>Official docs & reading</option>
                  <option>Video courses + exercises</option>
                  <option>Interactive coding practice</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Resource Budget</label>
                <select
                  value={budgetPreference}
                  onChange={(e) => setBudgetPreference(e.target.value as typeof budgetPreference)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="free_only">Free resources only</option>
                  <option value="free_preferred">Free preferred, optional paid</option>
                  <option value="paid_ok">Open to paid courses & books</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Learning Pace</label>
                <select
                  value={learningPace}
                  onChange={(e) => setLearningPace(e.target.value as typeof learningPace)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="steady">Steady weekly cadence</option>
                  <option value="intensive">Intensive sprint</option>
                  <option value="flexible">Flexible self-paced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Preferred Language</label>
                <input
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">06. Add a Key Project (Optional)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Logging a real project strengthens your readiness score by providing skill evidence.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Project Title</label>
                <input
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="e.g. Campus Event API & Portal"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Your Role</label>
                <input
                  value={projRole}
                  onChange={(e) => setProjRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="What problem does it solve and what did you build?"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Technologies (comma-separated)</label>
                <input
                  value={projTech}
                  onChange={(e) => setProjTech(e.target.value)}
                  placeholder="React, Node.js, PostgreSQL"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">GitHub URL</label>
                <input
                  value={projGithub}
                  onChange={(e) => setProjGithub(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">07. Review & Save Onboarding Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Candidate</div>
                <div className="font-semibold">{displayName}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {degree} · {college || 'Independent'} · {currentYear}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Target Role & Cadence</div>
                <div className="font-semibold">{selectedRole.name}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono tabular-nums">
                  {hoursPerWeek} hrs/week · {budgetPreference.replace('_', ' ')}
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 mb-2">Skills Ready to Sync ({draftSkills.length})</div>
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {draftSkills.map((s) => `${s.name} (${s.proficiency}/5)`).join(' · ') || 'None added'}
              </div>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          {step < 7 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(7, s + 1))}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving Profile...' : 'Save & Analyze Readiness'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
