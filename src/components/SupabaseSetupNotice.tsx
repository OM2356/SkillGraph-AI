import { AlertTriangle, Database, KeyRound } from 'lucide-react';

export function SupabaseSetupNotice() {
  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-5 text-sm text-amber-950 dark:text-amber-100 space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        Supabase Environment Variables Required
      </div>
      <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        Authentication and database persistence require your Supabase project keys. Public pages (Features and Career Paths) work without keys, while login and personal workspaces activate automatically once configured.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900 space-y-1">
          <div className="font-medium flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            1. Add Env Vars (.env.local / Vercel)
          </div>
          <code className="block font-mono text-[11px] text-slate-700 dark:text-slate-300">
            NEXT_PUBLIC_SUPABASE_URL<br />
            NEXT_PUBLIC_SUPABASE_ANON_KEY<br />
            SUPABASE_SERVICE_ROLE_KEY<br />
            GEMINI_API_KEY
          </code>
        </div>
        <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900 space-y-1">
          <div className="font-medium flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            2. Run SQL Schema
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Copy <code className="font-mono">supabase/schema.sql</code> into your Supabase SQL Editor and click Run to create tables, RLS rules, and the 15 seeded career roles.
          </p>
        </div>
      </div>
    </div>
  );
}
