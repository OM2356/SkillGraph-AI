'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { SupabaseSetupNotice } from '@/components/SupabaseSetupNotice';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAppToast } from '@/components/Providers';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useAppToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [supabaseReady, setSupabaseReady] = useState<boolean | null>(null);

  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    setSupabaseReady(Boolean(client));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg('Supabase is not configured. Please add your Supabase environment variables.');
      return;
    }

    setLoading(true);
    try {
      if (resetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/settings`,
        });
        if (error) throw error;
        setInfoMsg('Password reset instructions sent if an account exists for that email.');
        notify('Password reset email requested.', 'success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        notify('Signed in successfully.', 'success');
        router.push(nextPath);
        router.refresh();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sign in. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md w-full mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          {resetMode ? 'Reset your password' : 'Sign in to SkillGraph AI'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {resetMode
            ? 'Enter your account email to receive a password recovery link.'
            : 'Access your skill inventory, gap diagnostics, roadmaps, and AI coach.'}
        </p>
      </div>

      {supabaseReady === false && <SupabaseSetupNotice />}

      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
      >
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
            {infoMsg}
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {!resetMode && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetMode(true);
                  setErrorMsg('');
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || supabaseReady === false}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Please wait...' : resetMode ? 'Send Reset Link' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>

        {resetMode && (
          <button
            type="button"
            onClick={() => setResetMode(false)}
            className="w-full text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Back to Sign In
          </button>
        )}
      </form>

      <p className="text-center text-xs text-slate-600 dark:text-slate-400">
        New to SkillGraph AI?{' '}
        <Link href="/signup" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Create a free account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <Suspense fallback={<div className="text-sm text-slate-500">Loading sign in...</div>}>
          <LoginFormContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
