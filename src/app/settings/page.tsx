'use client';

import { useEffect, useState } from 'react';
import { Download, KeyRound, Moon, Sun } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAppToast } from '@/components/Providers';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { dark, toggleDark, notify } = useAppToast();
  const [health, setHealth] = useState<{ supabaseConfigured: boolean; geminiConfigured: boolean } | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});

    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) setUserEmail(data.user.email);
      });
    }
  }, []);

  async function sendPasswordReset() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !userEmail) return;
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
    if (error) notify(error.message, 'error');
    else notify(`Password reset email sent to ${userEmail}.`, 'success');
  }

  async function exportAllData() {
    setExporting(true);
    try {
      const [profile, skills, analyses, roadmaps, projects] = await Promise.all([
        fetch('/api/profile').then((r) => r.json()),
        fetch('/api/skills').then((r) => r.json()),
        fetch('/api/analysis').then((r) => r.json()),
        fetch('/api/roadmaps').then((r) => r.json()),
        fetch('/api/projects').then((r) => r.json()),
      ]);
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), profile, skills, analyses, roadmaps, projects }, null, 2)],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skillgraph-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Exported personal workspace JSON.', 'success');
    } catch {
      notify('Unable to export workspace data.', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell title="Settings" subtitle="Account security, appearance preferences, and workspace data portability.">
      <div className="max-w-2xl space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Theme Mode</div>
              <div className="text-xs text-slate-500">Switch between clean light and dark studio surfaces.</div>
            </div>
            <button
              onClick={toggleDark}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {dark ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold">Account Security & Data Export</h2>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Signed in as: <span className="font-mono text-slate-900 dark:text-white">{userEmail || 'Not loaded'}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={sendPasswordReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <KeyRound className="w-3.5 h-3.5" /> Request Password Reset
            </button>
            <button
              onClick={exportAllData}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Export Workspace JSON'}
            </button>
          </div>
        </div>

        {health && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-2 text-xs">
            <h2 className="text-sm font-semibold mb-2">Environment Configuration Status</h2>
            <div className="flex justify-between">
              <span className="text-slate-500">Supabase Auth & PostgreSQL</span>
              <span className="font-mono">{health.supabaseConfigured ? 'Configured' : 'Missing env vars'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Server-side Gemini API</span>
              <span className="font-mono">{health.geminiConfigured ? 'Configured' : 'Missing GEMINI_API_KEY'}</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
