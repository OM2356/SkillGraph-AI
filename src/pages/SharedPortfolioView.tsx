import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, FolderGit2, Layers } from 'lucide-react';
import { getSharedPortfolio } from '../services/firestoreService';
import { PROFICIENCY_LABELS, type ProficiencyLevel } from '../shared/types';

interface SharedPortfolioViewProps {
  slug: string;
  onExit: () => void;
}

export function SharedPortfolioView({ slug, onExit }: SharedPortfolioViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSharedPortfolio(slug)
      .then((res) => {
        if (!active) return;
        setData(res);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load shared portfolio.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="text-sm text-slate-500">Loading shared portfolio...</div>
      </div>
    );
  }

  if (error || !data || data.isPublic !== true) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Portfolio Not Available
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
            {error || 'This portfolio link is private or does not exist.'}
          </p>
          <button
            onClick={onExit}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to SkillGraph AI
          </button>
        </div>
      </div>
    );
  }

  const skills = (data.skills as Array<{ name: string; category: string; proficiency: number }>) || [];
  const projects =
    (data.projects as Array<{
      title: string;
      description: string;
      techStack: string[];
      githubUrl?: string;
      liveUrl?: string;
      status: string;
    }>) || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display font-bold text-base">SkillGraph AI · Verified Portfolio</span>
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Open SkillGraph AI
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Target Role: {String(data.targetRoleName || 'Software Engineer')}
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {String(data.ownerName || 'Candidate')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {[data.degree, data.college].filter(Boolean).join(' · ') || 'Independent Builder'}
          </p>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h2 className="text-lg font-semibold">Technical Skills ({skills.length})</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {skills.map((s) => (
              <div
                key={s.name}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.category}</div>
                </div>
                <span className="font-mono text-xs tabular-nums text-indigo-600 dark:text-indigo-400">
                  {PROFICIENCY_LABELS[(s.proficiency as ProficiencyLevel) || 3]} ({s.proficiency}/5)
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <FolderGit2 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-lg font-semibold">Projects ({projects.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((p, idx) => (
              <div
                key={`${p.title}-${idx}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    Status: {p.status.replace('_', ' ')}
                  </div>
                  <h3 className="text-base font-semibold mb-2">{p.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {p.description}
                  </p>
                  <div className="text-xs font-mono text-slate-500 mb-4">
                    {(p.techStack || []).join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  {p.githubUrl && (
                    <a
                      href={p.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      GitHub <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {p.liveUrl && (
                    <a
                      href={p.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Live Demo <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
