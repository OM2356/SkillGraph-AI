import { useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, Search, Target } from 'lucide-react';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { compareRolesAPI } from '../services/apiClient';
import { updateUserProfile } from '../services/firestoreService';
import { CAREER_ROLE_DISCLAIMER, PROJECT_TEMPLATES } from '../shared/catalogData';
import type { CareerRole, SkillGapAnalysis } from '../shared/types';

export function CareerExplorerPage() {
  const { user, profile, skills, projects, careerRoles } = useApp();
  const { notify } = useToast();

  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('All');
  const [seniorityFilter, setSeniorityFilter] = useState('All');
  const [selectedRole, setSelectedRole] = useState<CareerRole>(
    () => careerRoles.find((r) => r.id === profile?.targetRoleId) || careerRoles[0]
  );

  // Role Comparison
  const [compareMode, setCompareMode] = useState(false);
  const [roleAId, setRoleAId] = useState(careerRoles[0]?.id || 'sde');
  const [roleBId, setRoleBId] = useState(careerRoles[1]?.id || 'full-stack-developer');
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<{
    roleA: { role: CareerRole; analysis: Omit<SkillGapAnalysis, 'id' | 'userId'> };
    roleB: { role: CareerRole; analysis: Omit<SkillGapAnalysis, 'id' | 'userId'> };
    recommendedRoleId: string;
  } | null>(null);

  const domains = useMemo(
    () => ['All', ...Array.from(new Set(careerRoles.map((r) => r.domain)))],
    [careerRoles]
  );
  const seniorities = useMemo(
    () => ['All', ...Array.from(new Set(careerRoles.map((r) => r.seniorityLevel)))],
    [careerRoles]
  );

  const filtered = useMemo(() => {
    return careerRoles.filter((r) => {
      if (domainFilter !== 'All' && r.domain !== domainFilter) return false;
      if (seniorityFilter !== 'All' && r.seniorityLevel !== seniorityFilter) return false;
      if (search.trim()) {
        const hay = `${r.name} ${r.domain} ${r.description}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [careerRoles, domainFilter, seniorityFilter, search]);

  const handleSetTargetRole = async (role: CareerRole) => {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, {
        targetRoleId: role.id,
        targetRoleName: role.name,
        careerDomain: role.domain,
      });
      notify(`Target role updated to ${role.name}.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update target role.', 'error');
    }
  };

  const handleCompare = async () => {
    setComparing(true);
    try {
      const res = await compareRolesAPI({
        roleIdA: roleAId,
        roleIdB: roleBId,
        userSkills: skills,
        userProjects: projects,
        hoursPerWeek: profile?.hoursPerWeek || 10,
        customRoles: careerRoles.filter((r) => r.isCustom),
      });
      setComparison(res.comparison);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Role comparison failed.', 'error');
    } finally {
      setComparing(false);
    }
  };

  const relatedProjects = useMemo(
    () => PROJECT_TEMPLATES.filter((p) => p.roleIds.includes(selectedRole.id)),
    [selectedRole]
  );

  return (
    <div className="space-y-6">
      {/* Top Filter & Compare Toggle */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search career roles..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            {domains.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Domains' : d}
              </option>
            ))}
          </select>
          <select
            value={seniorityFilter}
            onChange={(e) => setSeniorityFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            {seniorities.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Levels' : s}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setCompareMode((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
            compareMode
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          {compareMode ? 'Browse Catalog' : 'Compare Two Roles'}
        </button>
      </div>

      {/* Role Comparison Mode */}
      {compareMode ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5">Role A</label>
              <select
                value={roleAId}
                onChange={(e) => setRoleAId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {careerRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5">Role B</label>
              <select
                value={roleBId}
                onChange={(e) => setRoleBId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {careerRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCompare}
              disabled={comparing}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap"
            >
              {comparing ? 'Comparing...' : 'Run Profile Comparison'}
            </button>
          </div>

          {comparison && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[comparison.roleA, comparison.roleB].map((entry) => {
                const isRec = comparison.recommendedRoleId === entry.role.id;
                return (
                  <div
                    key={entry.role.id}
                    className={`p-5 rounded-xl border ${
                      isRec
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">
                        {entry.role.domain} {isRec ? '· Best Current Fit' : ''}
                      </span>
                      <span className="font-mono tabular-nums text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {entry.analysis.readinessScore}% Ready
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-3">{entry.role.name}</h3>
                    <div className="grid grid-cols-3 gap-3 text-xs mb-4 font-mono tabular-nums">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="text-slate-500">Matched</div>
                        <div className="text-base font-semibold text-emerald-600">{entry.analysis.matchedCount}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="text-slate-500">Gaps</div>
                        <div className="text-base font-semibold text-amber-600">
                          {entry.analysis.improveCount + entry.analysis.missingCount}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="text-slate-500">Prep Est.</div>
                        <div className="text-base font-semibold">{entry.analysis.estimatedHours}h</div>
                      </div>
                    </div>
                    <div className="text-xs font-medium mb-1.5">Top Gaps for This Role:</div>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 mb-4">
                      {entry.analysis.gapItems
                        .filter((g) => g.gapScore > 0)
                        .slice(0, 5)
                        .map((g) => (
                          <li key={g.skillName} className="flex justify-between">
                            <span>{g.skillName}</span>
                            <span className="font-mono tabular-nums text-slate-500">
                              {g.currentProficiency}/{g.targetProficiency}
                            </span>
                          </li>
                        ))}
                    </ul>
                    <button
                      onClick={() => handleSetTargetRole(entry.role)}
                      className="w-full py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900"
                    >
                      Set {entry.role.name} as Target
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Role List */}
          <div className="lg:col-span-5 space-y-3">
            {filtered.map((role) => {
              const isSelected = selectedRole.id === role.id;
              const isCurrentTarget = profile?.targetRoleId === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>{role.domain} · {role.seniorityLevel}</span>
                    {isCurrentTarget && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active Target</span>
                    )}
                  </div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white">{role.name}</div>
                  <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                    {role.requiredSkills.length} required · {role.importantSkills.length} important
                  </div>
                </button>
              );
            })}
          </div>

          {/* Role Detail Panel */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 h-fit">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedRole.domain} · {selectedRole.seniorityLevel}
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedRole.name}
                </h2>
              </div>
              <button
                onClick={() => handleSetTargetRole(selectedRole)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap shrink-0"
              >
                {profile?.targetRoleId === selectedRole.id ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Current Target Role
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4" />
                    Set as Target Role
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedRole.description}
            </p>

            <div>
              <h3 className="text-sm font-semibold mb-2.5">Skill Matrix & Weights</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {[...selectedRole.requiredSkills, ...selectedRole.importantSkills, ...selectedRole.optionalSkills].map(
                  (skill) => (
                    <div key={`${skill.tier}-${skill.name}`} className="px-4 py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{skill.name}</span>
                        <span className="text-slate-400 ml-2">
                          ({skill.tier} · {skill.category})
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        Lvl {skill.targetProficiency}/5 · Wt {skill.weight}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <h4 className="text-sm font-semibold mb-2">Example Responsibilities</h4>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                  {selectedRole.exampleResponsibilities.map((resp) => (
                    <li key={resp}>{resp}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Typical Career Progression</h4>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {selectedRole.careerProgression.map((lvl, idx) => (
                    <div key={lvl} className="font-mono">
                      0{idx + 1}. {lvl}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {relatedProjects.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Suggested Portfolio Projects</h4>
                <div className="space-y-2">
                  {relatedProjects.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="font-semibold text-slate-900 dark:text-white">{p.title}</div>
                      <div className="text-slate-500 mt-0.5">
                        {p.difficulty} · {p.estimatedHours}h · {p.skillsCovered.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
              {CAREER_ROLE_DISCLAIMER}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
