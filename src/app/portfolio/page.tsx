'use client';

import { useEffect, useState } from 'react';
import { Briefcase, ExternalLink, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { CardsSkeleton } from '@/components/Skeleton';
import { useAppToast } from '@/components/Providers';
import type { UserProfile, UserProject } from '@/shared/types';

export default function PortfolioPage() {
  const { notify } = useAppToast();
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/projects'), fetch('/api/profile')])
      .then(async ([pRes, profRes]) => {
        const pJson = await pRes.json();
        const profJson = profRes.ok ? await profRes.json() : null;
        setProjects(pJson.projects || []);
        if (profJson?.profile) setProfile(profJson.profile);
      })
      .finally(() => setLoading(false));
  }, []);

  async function runReview(projectId: string) {
    setReviewingId(projectId);
    try {
      const res = await fetch('/api/ai/portfolio-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Portfolio review failed');
      setProjects((prev) => prev.map((p) => (p.id === projectId ? json.project : p)));
      notify('AI portfolio audit saved.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to review project.', 'error');
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <AppShell
      title="Portfolio & AI Review"
      subtitle="Audit your repositories against hiring standards for your target role."
    >
      {loading ? (
        <CardsSkeleton count={3} />
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">Target Role Benchmark</div>
              <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                {profile?.targetRoleName || 'Software Engineer'}
              </div>
            </div>
            <div className="font-mono tabular-nums text-xs text-slate-500">
              {projects.length} projects · {projects.filter((p) => p.aiReview).length} AI audited
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500">
              Add projects on the Projects page first, then run principal-engineer audits here.
            </div>
          ) : (
            <div className="space-y-5">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{p.title}</h2>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-3">
                        <span className="capitalize">{p.status.replace('_', ' ')}</span>
                        {p.githubUrl && (
                          <a
                            href={p.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                          >
                            GitHub <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => runReview(p.id)}
                      disabled={reviewingId === p.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {reviewingId === p.id
                        ? 'Auditing...'
                        : p.aiReview
                        ? 'Re-run AI Audit'
                        : 'Run AI Audit'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {p.description}
                  </p>

                  {p.aiReview && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          AI Engineering Audit
                        </span>
                        <span className="font-mono tabular-nums text-sm font-bold text-indigo-600">
                          Relevance Score: {p.aiReview.relevanceScore}/100
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white">Complexity:</strong>{' '}
                        {p.aiReview.complexityAssessment}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white">Repo & Docs:</strong>{' '}
                        {p.aiReview.repoPresentation}
                      </p>
                      {p.aiReview.actionableImprovements.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-1">Actionable Improvements</div>
                          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                            {p.aiReview.actionableImprovements.map((imp, i) => (
                              <li key={i}>· {imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
