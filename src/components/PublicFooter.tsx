'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export function PublicFooter() {
  const [modal, setModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <>
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-display font-semibold text-slate-900 dark:text-white mr-3">
              SkillGraph AI
            </span>
            <span>Educational career readiness & roadmap engine.</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/features" className="hover:text-slate-900 dark:hover:text-white">
              Features
            </Link>
            <Link href="/careers" className="hover:text-slate-900 dark:hover:text-white">
              Career Paths
            </Link>
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-white">
              Sign In
            </Link>
            <button onClick={() => setModal('privacy')} className="hover:text-slate-900 dark:hover:text-white">
              Privacy
            </button>
            <button onClick={() => setModal('terms')} className="hover:text-slate-900 dark:hover:text-white">
              Methodology & Disclaimer
            </button>
          </div>
        </div>
      </footer>

      {modal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {modal === 'privacy' ? 'Privacy & Row-Level Data Ownership' : 'Methodology & Educational Disclaimer'}
              </h3>
              <button onClick={() => setModal(null)} aria-label="Close modal" className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              {modal === 'privacy'
                ? 'Your skills, gap analyses, learning roadmaps, portfolio projects, and coach conversations belong exclusively to your authenticated Supabase account protected by PostgreSQL Row-Level Security policies.'
                : 'SkillGraph AI provides educational career guidance and deterministic weighted skill estimates based on the profile information you enter. It does not guarantee job placement or represent official hiring criteria at any company.'}
            </p>
            <button
              onClick={() => setModal(null)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
