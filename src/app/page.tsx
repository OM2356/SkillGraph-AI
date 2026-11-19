'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Compass,
  FolderGit2,
  Layers,
  Map as MapIcon,
  MessageSquare,
  ShieldCheck,
  Target,
  X,
} from 'lucide-react';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { CAREER_ROLE_DISCLAIMER, SEEDED_CAREER_ROLES } from '@/shared/catalogData';
import type { CareerRole } from '@/shared/types';

export default function HomePage() {
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [previewRole, setPreviewRole] = useState<CareerRole | null>(null);

  const domains = ['All', ...Array.from(new Set(SEEDED_CAREER_ROLES.map((r) => r.domain)))];
  const visibleRoles =
    selectedDomain === 'All'
      ? SEEDED_CAREER_ROLES
      : SEEDED_CAREER_ROLES.filter((r) => r.domain === selectedDomain);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <PublicHeader />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-14 pb-20 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400 mb-4">
              AI-Powered Skill Gap Analysis & Career Roadmap Engine
            </p>
            <h1 className="font-display font-bold tracking-tight text-slate-900 dark:text-white text-4xl sm:text-5xl lg:text-[3.35rem] leading-[1.08] max-w-2xl [text-wrap:balance] mb-6">
              Know Your Skills. Close Your Gaps. Build Your Career.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mb-8">
              AI-powered career intelligence that transforms your current skills into a personalized roadmap for your dream role. Measure readiness with transparent weighted scoring, ship targeted portfolio projects, and track real weekly progress.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
              >
                Analyze My Skills
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/careers"
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Explore Careers
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800 max-w-xl">
              <div>
                <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white">
                  15 Roles
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Weighted skill benchmarks
                </div>
              </div>
              <div>
                <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white">
                  5 Phases
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Structured roadmap sprints
                </div>
              </div>
              <div>
                <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white">
                  100%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Transparent score formula
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Preview & Visual */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 min-h-[240px] flex-1">
              <img
                src="/images/hero_career_architecture.jpg"
                alt="Software engineers collaborating at dual-monitor workstations with skill graph visualizations"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover min-h-[240px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent flex flex-col justify-end p-5">
                <p className="text-xs text-slate-300 font-mono tabular-nums">
                  Illustrative Preview · Software Development Engineer
                </p>
                <p className="text-sm font-medium text-white mt-1">
                  Weighted Skill Match vs. Role Benchmarks
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Example Readiness Breakdown
                  </div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white">
                    Software Development Engineer
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">68%</div>
                  <div className="text-[11px] text-slate-500">Readiness</div>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Data Structures & Algorithms</span>
                    <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">3 / 4 Target</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-3/4 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">SQL & Relational Modeling</span>
                    <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">3 / 3 Target</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 w-full rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">REST APIs & System Internals</span>
                    <span className="font-mono tabular-nums text-red-600 dark:text-red-400">1 / 3 Target</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 w-1/3 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                Why Random Tutorials Fail
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-6 [text-wrap:balance]">
                Most students study hard without knowing what actually closes their hiring gap.
              </h2>
              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Job descriptions list dozens of frameworks without clarifying which fundamentals carry the heaviest engineering weight versus optional familiarity.
                </p>
                <p>
                  Without structured gap visibility, learners bounce between disconnected tutorials and build generic toy projects that fail to prove production capability.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1.5">
                  Weighted Role Calibration
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Compares your 1–5 skill proficiencies and project evidence against weighted role benchmarks.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <MapIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1.5">
                  30 / 60 / 90-Day Roadmaps
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Translates gaps into 5-phase study sprints scoped to your real weekly study hours.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <FolderGit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1.5">
                  Targeted Project Blueprints
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Recommends realistic engineering builds designed specifically to demonstrate your missing skills.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1.5">
                  Recalculated Readiness History
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tracks completed tasks, study hours, and before/after readiness improvements over time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400 mb-2">Workflow</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Five steps from skill inventory to interview-ready portfolio
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[
            { num: '01.', title: 'Build Your Profile', body: 'Log your academic background, current skills (1–5 scale), projects, and weekly study hours.' },
            { num: '02.', title: 'Select Target Role', body: 'Choose from 15 structured engineering, data, cloud, security, or design career paths.' },
            { num: '03.', title: 'Analyze Skill Gaps', body: 'Run deterministic weighted scoring paired with an AI narrative report and 30-day action plan.' },
            { num: '04.', title: 'Follow Your Roadmap', body: 'Work through 5 structured learning phases with verifiable resources and task milestones.' },
            { num: '05.', title: 'Ship & Recalculate', body: 'Publish portfolio projects, run AI repository audits, and measure your readiness gains.' },
          ].map((step) => (
            <div key={step.num} className="border-t-2 border-slate-200 dark:border-slate-800 pt-5">
              <div className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                {step.num}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-2">{step.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400 mb-2">Platform Capabilities</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Built as an end-to-end career engineering workspace
              </h2>
            </div>
            <Link
              href="/features"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
            >
              View full feature breakdown →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
              <div>
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Deterministic Gap Engine + Gemini AI Report
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  We never leave scoring math to guesswork. The backend deterministically computes proficiency gaps, weighted skill matches, and study hour estimates first, then uses Gemini to generate tailored explanations, weekly cadence, and PDF-exportable reports.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-6 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>PDF Report Export</span>
                <span>Historical Comparisons</span>
                <span>Project Evidence Bonus</span>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Contextual AI Career Coach
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Ask technical questions, review study plans, or drill interview concepts with an advisor aware of your exact skill gaps, active roadmap tasks, and portfolio projects.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Side-by-Side Role Explorer
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Compare two target careers (e.g., Full Stack Developer vs. Backend Developer) to inspect skill overlap and preparation effort.
              </p>
            </div>

            <div className="md:col-span-2 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div>
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Portfolio Review & Curated Resources
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Track GitHub repositories and live demos, run AI engineering audits for complexity and missing features, and bookmark verified official documentation.
                </p>
              </div>
              <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 h-44 bg-slate-200 dark:bg-slate-800">
                <img
                  src="/images/portfolio_project_preview.jpg"
                  alt="Developer desk displaying system architecture diagram and engineering notes"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Career Paths */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400 mb-2">Career Catalog</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              15 Supported Technical Career Paths
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            {CAREER_ROLE_DISCLAIMER}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 mb-8 w-fit max-w-full overflow-x-auto">
          {domains.slice(0, 7).map((domain) => (
            <button
              key={domain}
              onClick={() => setSelectedDomain(domain)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedDomain === domain
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {domain}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleRoles.slice(0, 9).map((role) => (
            <button
              key={role.id}
              onClick={() => setPreviewRole(role)}
              className="text-left p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  {role.domain} · {role.seniorityLevel}
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                  {role.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
                  {role.description}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {role.requiredSkills.length} core skills · {role.importantSkills.length} important
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">Inspect</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 transition-colors"
          >
            Browse & Compare All 15 Roles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Methodology & Illustrative Scenarios */}
      <section id="methodology" className="bg-slate-900 text-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-3">
                <ShieldCheck className="w-4 h-4" />
                Transparent Assessment Methodology
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
                Deterministic scoring you can inspect and verify
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6 max-w-2xl">
                Every readiness score is computed on the server using a reproducible weighted formula mapping Beginner (1) through Expert (5) against role skill importance weights, plus verified project evidence. SkillGraph AI provides educational guidance—never black-box predictions or employment guarantees.
              </p>
              <div className="font-mono text-xs bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-300 overflow-x-auto">
                Weighted Skill Match = Σ( min(UserLevel, TargetLevel) / TargetLevel × Weight ) / Σ( Weight )
              </div>
            </div>
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-6 flex items-center gap-5">
              <img
                src="/images/career_advisor_portrait.jpg"
                alt="Senior software architect and career mentor portrait"
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full object-cover shrink-0 border border-slate-700"
              />
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Ready to build your roadmap?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Create a free account to save your skill inventory, run your first gap diagnostic, and track weekly milestones.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors whitespace-nowrap"
                >
                  Start Free Analysis
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-800">
            <p className="text-xs font-mono text-slate-400 mb-4">
              Illustrative Learner Scenarios (Sample Use Cases)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  label: 'Final-Year CS Student',
                  role: 'Target: Software Development Engineer',
                  note: 'Had strong Java & DSA fundamentals (Lvl 4) but lacked SQL and REST API project proof. Focused a 30-day sprint on PostgreSQL schemas and a tested API repository.',
                },
                {
                  label: 'Analytics Transitioner',
                  role: 'Target: Data Analyst',
                  note: 'Used side-by-side comparison between Data Analyst and Data Scientist to prioritize SQL window functions and Tableau storytelling before tackling advanced ML.',
                },
                {
                  label: 'Full-Stack Builder',
                  role: 'Target: AI Engineer',
                  note: 'Already fluent in TypeScript and React; generated a 60-day roadmap focused on RAG retrieval, structured JSON schemas, and evaluation harnesses.',
                },
              ].map((ex) => (
                <div key={ex.label} className="p-5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs font-medium text-indigo-400 mb-1">{ex.label}</div>
                  <div className="text-sm font-semibold text-white mb-2">{ex.role}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{ex.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />

      {/* Role Preview Modal */}
      {previewRole && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-w-2xl w-full max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {previewRole.domain} · {previewRole.seniorityLevel}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {previewRole.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewRole(null)}
                aria-label="Close role preview"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              {previewRole.description}
            </p>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
              Required Core Skills & Weights
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg mb-5">
              {previewRole.requiredSkills.map((s) => (
                <div key={s.name} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Target {s.targetProficiency}/5 · Weight {s.weight}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Sign up to benchmark your personal skills against this role.
              </span>
              <Link
                href="/signup"
                onClick={() => setPreviewRole(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Analyze Against This Role
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
