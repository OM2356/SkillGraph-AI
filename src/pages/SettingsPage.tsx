import { Download, Moon, Sun } from 'lucide-react';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface SettingsPageProps {
  dark: boolean;
  onToggleDark: () => void;
}

export function SettingsPage({ dark, onToggleDark }: SettingsPageProps) {
  const { profile, skills, projects, analyses, roadmaps } = useApp();
  const { notify } = useToast();

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      skills,
      projects,
      analyses,
      roadmaps,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillgraph-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported your complete SkillGraph AI data.', 'success');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Appearance</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Switch between light mode and dark slate workspace theme.
          </p>
        </div>
        <button
          onClick={onToggleDark}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Data Portability</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Download a JSON archive of your profile, skills, projects, analyses, and roadmaps.
          </p>
        </div>
        <button
          onClick={handleExportJson}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-indigo-600 hover:opacity-90"
        >
          <Download className="w-4 h-4" />
          Export JSON
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-2">
        <h3 className="text-base font-semibold">Authentication & Security</h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Signed in via Firebase Authentication (Google Sign-In) with verified email enforcement. All Firestore collections enforce strict owner-only read/write rules and backend Gemini requests authenticate via signed Firebase ID tokens.
        </p>
      </div>
    </div>
  );
}
