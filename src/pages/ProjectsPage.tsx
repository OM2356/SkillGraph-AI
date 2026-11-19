import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Loader2, Plus, Sparkles } from 'lucide-react';
import { CardsSkeleton } from '../components/Skeleton';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { AppRoute } from '../layouts/AppShell';
import { generateProjectRecommendationsAPI } from '../services/apiClient';
import { upsertUserProject } from '../services/firestoreService';
import { PROJECT_TEMPLATES } from '../shared/catalogData';
import type { ProjectTemplate } from '../shared/types';

interface ProjectsPageProps {
  onNavigate: (route: AppRoute) => void;
}

export function ProjectsPage({ onNavigate }: ProjectsPageProps) {
  const { user, profile, skills, projects, analyses, roadmaps, careerRoles } = useApp();
  const { notify } = useToast();

  const [difficulty, setDifficulty] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('All');
  const [aiTemplates, setAiTemplates] = useState<ProjectTemplate[]>([]);
  const [generating, setGenerating] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const targetRole = careerRoles.find((r) => r.id === profile?.targetRoleId) || careerRoles[0];
  const activeRoadmap = roadmaps.find((r) => r.status === 'active') || roadmaps[0] || null;

  const combinedTemplates = useMemo(() => {
    const curated = PROJECT_TEMPLATES.filter((t) => t.roleIds.includes(targetRole.id));
    const others = PROJECT_TEMPLATES.filter((t) => !t.roleIds.includes(targetRole.id));
    return [...aiTemplates, ...curated, ...others].filter(
      (t) => difficulty === 'All' || t.difficulty === difficulty
    );
  }, [aiTemplates, targetRole.id, difficulty]);

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const gapItems = analyses[0]?.gapItems || [];
      const missingSkills = gapItems.filter((g) => g.status === 'missing').map((g) => g.skillName);
      const skillsToImprove = gapItems
        .filter((g) => g.status === 'needs_improvement')
        .map((g) => g.skillName);

      const res = await generateProjectRecommendationsAPI({
        targetRoleId: targetRole.id,
        customRole: targetRole.isCustom ? targetRole : undefined,
        missingSkills: missingSkills.length > 0 ? missingSkills : gapItems.filter((g) => g.gapScore > 0).map((g) => g.skillName),
        skillsToImprove,
        existingSkills: skills.map((s) => `${s.name} (${s.proficiency}/5)`),
        existingProjects: projects.map((p) => p.title),
        roadmapFocus: activeRoadmap
          ? `${activeRoadmap.title} (${activeRoadmap.durationDays}-day plan)`
          : undefined,
      });
      setAiTemplates(res.projects);
      notify('Generated Beginner, Intermediate & Advanced blueprints tailored to your gaps!', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to generate projects.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddToPortfolio = async (tpl: ProjectTemplate) => {
    if (!user) return;
    try {
      await upsertUserProject(user.uid, {
        title: tpl.title,
        description: `${tpl.problemStatement} ${tpl.objective}`.trim(),
        techStack: tpl.techStack,
        skillsDemonstrated: tpl.skillsCovered,
        status: 'idea',
        userRole: 'Developer',
        achievements: `Deliverables: ${tpl.deliverables.join(', ')} | Milestones: ${tpl.milestones.join(' | ')}`,
      });
      notify(`Added "${tpl.title}" to your Portfolio tracker.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to add project.', 'error');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Project Recommendation Engine</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Practical engineering builds aligned with {targetRole.name}, missing skills, and existing portfolio ({projects.length} tracked).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDifficulty(lvl)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  difficulty === lvl ? 'bg-white dark:bg-slate-800 shadow-xs' : 'text-slate-500'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleGenerateAI}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating Blueprints...' : 'Generate AI Blueprints'}
          </button>
        </div>
      </div>

      {generating ? (
        <CardsSkeleton count={4} />
      ) : combinedTemplates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
          <h3 className="text-base font-semibold mb-1">No Matching Project Blueprints</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Switch the difficulty filter to "All" or generate new custom AI blueprints above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {combinedTemplates.map((tpl) => {
            const alreadyAdded = projects.some(
              (p) => p.title.toLowerCase() === tpl.title.toLowerCase()
            );
            const isRoleMatch = tpl.roleIds.includes(targetRole.id);
            const isExpanded = Boolean(expandedIds[tpl.id]);

            return (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {tpl.difficulty} · {tpl.estimatedHours}h est.
                      {isRoleMatch ? ` · Recommended for ${targetRole.name}` : ''}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {tpl.title}
                  </h3>
                  {tpl.problemStatement && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Problem: </span>
                      {tpl.problemStatement}
                    </p>
                  )}
                  {tpl.objective && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {tpl.objective}
                    </p>
                  )}

                  {tpl.reasoning && (
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                      Why now: {tpl.reasoning}
                    </p>
                  )}

                  <div className="text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Skills Covered: </span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {tpl.skillsCovered.join(', ')}
                    </span>
                  </div>

                  <div className="text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Tech Stack: </span>
                    <span className="font-mono text-slate-500">{tpl.techStack.join(' · ')}</span>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Key Milestones:
                    </div>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
                      {tpl.milestones.slice(0, 3).map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      {tpl.features.length > 0 && (
                        <div>
                          <div className="font-medium text-slate-700 dark:text-slate-200 mb-1">Core Features:</div>
                          <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc pl-4">
                            {tpl.features.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {tpl.deliverables.length > 0 && (
                        <div>
                          <div className="font-medium text-slate-700 dark:text-slate-200 mb-1">Expected Deliverables:</div>
                          <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc pl-4">
                            {tpl.deliverables.map((d) => (
                              <li key={d}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {tpl.portfolioValue && (
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-200">Portfolio Value: </span>
                          <span className="text-slate-600 dark:text-slate-400">{tpl.portfolioValue}</span>
                        </div>
                      )}
                      {tpl.advancedExtensions.length > 0 && (
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-200">Optional Advanced Extensions: </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {tpl.advancedExtensions.join(' · ')}
                          </span>
                        </div>
                      )}
                      {tpl.githubTips && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          GitHub presentation tip: {tpl.githubTips}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  {alreadyAdded ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('portfolio')}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <Check className="w-3.5 h-3.5" />
                      In Your Portfolio — Track Progress
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToPortfolio(tpl)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Save to My Portfolio
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleExpanded(tpl.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {isExpanded ? (
                      <>
                        Hide Blueprint Details <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Full Blueprint Details <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
