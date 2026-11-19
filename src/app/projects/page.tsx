'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, FolderGit2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CardsSkeleton } from '@/components/Skeleton';
import { useAppToast } from '@/components/Providers';
import { PROJECT_TEMPLATES } from '@/shared/catalogData';
import type { ProjectTemplate, UserProject } from '@/shared/types';

export default function ProjectsPage() {
  const { notify } = useAppToast();
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [recommendations, setRecommendations] = useState<ProjectTemplate[]>(PROJECT_TEMPLATES.slice(0, 3));
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);
  const [recWarning, setRecWarning] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techStackText, setTechStackText] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [status, setStatus] = useState<'idea' | 'in_progress' | 'completed'>('in_progress');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProject | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((json) => setProjects(json.projects || []))
      .finally(() => setLoading(false));
  }, []);

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          techStack: techStackText.split(',').map((s) => s.trim()).filter(Boolean),
          skillsDemonstrated: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
          githubUrl: githubUrl.trim(),
          liveUrl: liveUrl.trim(),
          status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add project');
      setProjects((prev) => [json.project, ...prev]);
      setTitle('');
      setDescription('');
      setTechStackText('');
      setSkillsText('');
      setGithubUrl('');
      setLiveUrl('');
      notify('Project saved to your portfolio.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to save project.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function startFromTemplate(tpl: ProjectTemplate) {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: tpl.title,
        description: `${tpl.objective} Key deliverables: ${tpl.deliverables.join('; ')}`,
        techStack: tpl.techStack,
        skillsDemonstrated: tpl.skillsCovered,
        status: 'in_progress',
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setProjects((prev) => [json.project, ...prev]);
      notify(`Added "${tpl.title}" to your active projects.`, 'success');
    }
  }

  async function updateProjectStatus(p: UserProject, nextStatus: UserProject['status']) {
    const res = await fetch(`/api/projects/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      const json = await res.json();
      setProjects((prev) => prev.map((item) => (item.id === p.id ? json.project : item)));
    }
  }

  async function generateAIRecommendations() {
    setRecommending(true);
    setRecWarning('');
    try {
      const res = await fetch('/api/ai/project-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useAI: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate recommendations');
      if (json.warning) setRecWarning(json.warning);
      setRecommendations(json.recommendations || []);
      notify('Generated tailored project blueprints.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to recommend projects.', 'error');
    } finally {
      setRecommending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      notify('Project deleted.', 'info');
    }
    setDeleteTarget(null);
  }

  return (
    <AppShell
      title="Projects & Blueprints"
      subtitle="Log your engineering projects and generate non-trivial blueprints targeting your skill gaps."
    >
      <div className="space-y-8">
        {/* Add Project Form */}
        <form
          onSubmit={addProject}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold">Add Portfolio Project</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project title"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <input
              type="text"
              value={techStackText}
              onChange={(e) => setTechStackText(e.target.value)}
              placeholder="Tech stack (comma-separated: React, PostgreSQL)"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Skills demonstrated (SQL, REST APIs)"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
          <textarea
            required
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe architecture, problem solved, and measurable engineering outcomes..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="GitHub repository URL"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <input
              type="url"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="Live demo URL"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              <option value="idea">Idea</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        </form>

        {/* My Projects */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">My Projects ({projects.length})</h2>
          {loading ? (
            <CardsSkeleton count={2} />
          ) : projects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">
              No projects logged yet. Add an existing project above or start one from a targeted blueprint below.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        {p.title}
                      </h3>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        aria-label={`Delete ${p.title}`}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {p.description}
                    </p>
                    {p.techStack && p.techStack.length > 0 && (
                      <div className="text-xs font-mono text-slate-500">
                        Stack: {p.techStack.join(' · ')}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <select
                      value={p.status}
                      onChange={(e) => updateProjectStatus(p, e.target.value as UserProject['status'])}
                      className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    >
                      <option value="idea">Idea</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <div className="flex items-center gap-3">
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
                      {p.liveUrl && (
                        <a
                          href={p.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                        >
                          Demo <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Targeted Project Blueprints */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Targeted Gap-Closing Blueprints</h2>
              <p className="text-xs text-slate-500">
                Production-styled builds tailored to missing competencies in your skill profile.
              </p>
            </div>
            <button
              onClick={generateAIRecommendations}
              disabled={recommending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-indigo-600 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {recommending ? 'Generating...' : 'Generate AI Blueprints'}
            </button>
          </div>

          {recWarning && (
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-900">
              {recWarning}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendations.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                    {tpl.difficulty} · ~{tpl.estimatedHours}h
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tpl.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {tpl.objective}
                  </p>
                  <div className="text-[11px] text-slate-500">
                    Skills: {tpl.skillsCovered.join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => startFromTemplate(tpl)}
                  className="w-full py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Start This Project
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Project?"
        description={`Remove "${deleteTarget?.title}" from your projects?`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
