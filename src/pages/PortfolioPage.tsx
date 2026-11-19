import { useEffect, useState } from 'react';
import {
  Copy,
  Edit3,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { reviewPortfolioProjectAPI } from '../services/apiClient';
import {
  deleteUserProject,
  publishSharedPortfolio,
  updateUserProfile,
  upsertUserProject,
} from '../services/firestoreService';
import type { UserProject } from '../shared/types';

export function PortfolioPage() {
  const { user, profile, skills, projects } = useApp();
  const { notify } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserProject | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UserProject | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    techStack: '',
    skillsDemonstrated: '',
    githubUrl: '',
    liveUrl: '',
    status: 'in_progress' as UserProject['status'],
    userRole: 'Developer',
    achievements: '',
  });

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      techStack: '',
      skillsDemonstrated: '',
      githubUrl: '',
      liveUrl: '',
      status: 'in_progress',
      userRole: 'Developer',
      achievements: '',
    });
    setModalOpen(true);
  };

  const openEdit = (proj: UserProject) => {
    setEditing(proj);
    setForm({
      title: proj.title,
      description: proj.description,
      techStack: (proj.techStack || []).join(', '),
      skillsDemonstrated: (proj.skillsDemonstrated || []).join(', '),
      githubUrl: proj.githubUrl || '',
      liveUrl: proj.liveUrl || '',
      status: proj.status,
      userRole: proj.userRole || 'Developer',
      achievements: proj.achievements || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim() || !form.description.trim()) {
      notify('Title and description are required.', 'error');
      return;
    }
    try {
      await upsertUserProject(user.uid, {
        id: editing?.id,
        title: form.title.trim(),
        description: form.description.trim(),
        techStack: form.techStack.split(',').map((t) => t.trim()).filter(Boolean),
        skillsDemonstrated: form.skillsDemonstrated.split(',').map((t) => t.trim()).filter(Boolean),
        githubUrl: form.githubUrl.trim(),
        liveUrl: form.liveUrl.trim(),
        status: form.status,
        userRole: form.userRole.trim(),
        achievements: form.achievements.trim(),
        aiReview: editing?.aiReview,
      });
      notify(editing ? 'Project updated.' : 'Project added to portfolio.', 'success');
      setModalOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save project.', 'error');
    }
  };

  const handleQuickStatus = async (proj: UserProject, nextStatus: UserProject['status']) => {
    if (!user) return;
    try {
      await upsertUserProject(user.uid, {
        ...proj,
        status: nextStatus,
      });
      notify(`Marked "${proj.title}" as ${nextStatus.replace('_', ' ')}.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update project status.', 'error');
    }
  };

  const handleRunReview = async (proj: UserProject) => {
    if (!user) return;
    setReviewingId(proj.id);
    try {
      const res = await reviewPortfolioProjectAPI({
        project: proj,
        targetRoleName: profile?.targetRoleName || 'Software Development Engineer',
      });
      await upsertUserProject(user.uid, {
        ...proj,
        aiReview: res.review,
      });
      notify('AI Portfolio Review saved!', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'AI portfolio review failed.', 'error');
    } finally {
      setReviewingId(null);
    }
  };

  const handleToggleShare = async () => {
    if (!user || !profile) return;
    setPublishing(true);
    try {
      const nextPublic = !profile.portfolioPublic;
      const slug = profile.portfolioSlug || `dev-${user.uid.slice(0, 10)}`;
      await publishSharedPortfolio({
        slug,
        userId: user.uid,
        ownerName: profile.displayName,
        targetRoleName: profile.targetRoleName || 'Software Engineer',
        college: profile.college || '',
        degree: profile.degree || '',
        isPublic: nextPublic,
        skills,
        projects,
      });
      await updateUserProfile(user.uid, { portfolioPublic: nextPublic, portfolioSlug: slug });
      notify(nextPublic ? 'Public portfolio link enabled!' : 'Portfolio set to private.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update sharing settings.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const shareUrl = `${window.location.origin}/?portfolio=${profile?.portfolioSlug || `dev-${user?.uid.slice(0, 10)}`}`;

  return (
    <div className="space-y-6">
      {/* Header & Shareable Profile Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Portfolio & AI Engineering Review</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track builds, run recruiter-grade AI reviews against {profile?.targetRoleName || 'your target role'}, and optionally share your profile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleToggleShare}
            disabled={publishing}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border ${
              profile?.portfolioPublic
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {profile?.portfolioPublic ? 'Public Sharing On' : 'Enable Public Link'}
          </button>

          {profile?.portfolioPublic && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                notify('Shareable portfolio URL copied!', 'success');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Link
            </button>
          )}

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        </div>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
          <h3 className="text-base font-semibold mb-1">No Portfolio Projects Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Add your GitHub repositories or pick a project from Project Recommendations to prove your skills.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Add First Project
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-500">
                    Role: {proj.userRole || 'Developer'}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{proj.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                    {proj.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    aria-label={`Progress status for ${proj.title}`}
                    value={proj.status}
                    onChange={(e) => handleQuickStatus(proj, e.target.value as UserProject['status'])}
                    className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-medium"
                  >
                    <option value="idea">Idea</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRunReview(proj)}
                    disabled={reviewingId === proj.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap"
                  >
                    {reviewingId === proj.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {reviewingId === proj.id ? 'Reviewing...' : 'AI Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(proj)}
                    aria-label="Edit project"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(proj)}
                    aria-label="Delete project"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                {proj.techStack && proj.techStack.length > 0 && (
                  <span className="font-mono text-slate-500">Stack: {proj.techStack.join(' · ')}</span>
                )}
                {proj.skillsDemonstrated && proj.skillsDemonstrated.length > 0 && (
                  <span className="text-indigo-600 dark:text-indigo-400">
                    Skills: {proj.skillsDemonstrated.join(', ')}
                  </span>
                )}
                {proj.githubUrl && (
                  <a
                    href={proj.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    GitHub Repo <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {proj.liveUrl && (
                  <a
                    href={proj.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Live Demo <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {proj.achievements && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Milestones / Outcomes: {proj.achievements}
                </p>
              )}

              {proj.aiReview && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      AI Portfolio Audit Feedback
                    </span>
                    <span className="font-mono tabular-nums text-xs font-bold">
                      Role Relevance: {proj.aiReview.relevanceScore}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">Complexity: </span>
                      {proj.aiReview.complexityAssessment}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">Repository & Docs: </span>
                      {proj.aiReview.documentationFeedback} {proj.aiReview.repoPresentation}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Missing Features</div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                        {proj.aiReview.missingFeatures.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                        Actionable Improvements
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                        {proj.aiReview.actionableImprovements.map((imp) => (
                          <li key={imp}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <form
            onSubmit={handleSave}
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{editing ? 'Edit Project' : 'Add Portfolio Project'}</h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Project Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as UserProject['status'] })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="idea">Idea</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Your Role</label>
                  <input
                    value={form.userRole}
                    onChange={(e) => setForm({ ...form, userRole: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tech Stack (comma-separated)</label>
                <input
                  value={form.techStack}
                  onChange={(e) => setForm({ ...form, techStack: e.target.value })}
                  placeholder="TypeScript, React, Express, PostgreSQL"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Skills Demonstrated (comma-separated)</label>
                <input
                  value={form.skillsDemonstrated}
                  onChange={(e) => setForm({ ...form, skillsDemonstrated: e.target.value })}
                  placeholder="REST APIs, Authentication, SQL"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">GitHub URL</label>
                <input
                  value={form.githubUrl}
                  onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Live Demo URL</label>
                <input
                  value={form.liveUrl}
                  onChange={(e) => setForm({ ...form, liveUrl: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Achievements / Milestones</label>
                <input
                  value={form.achievements}
                  onChange={(e) => setForm({ ...form, achievements: e.target.value })}
                  placeholder="e.g. Reduced p95 latency by 35%, wrote 20 automated tests"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save Project
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete Project"
        description={`Remove "${confirmDelete?.title}" from your portfolio?`}
        confirmLabel="Delete Project"
        onConfirm={async () => {
          if (user && confirmDelete) {
            await deleteUserProject(user.uid, confirmDelete.id);
            notify('Project deleted.', 'info');
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
