import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Compass,
  FolderGit2,
  Map as MapIcon,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';

const MODULES = [
  {
    icon: Sparkles,
    title: 'Deterministic + AI Skill Gap Engine',
    summary:
      'Computes exact weighted proficiency matches against required, important, and optional skills before Gemini generates candidate-specific explanations and a 30-day action plan.',
    highlights: [
      'Weights skills from 1–10 by role importance',
      'Applies +8% bonus cap for skills backed by portfolio projects',
      'Saves historical snapshots for side-by-side progress comparisons',
    ],
  },
  {
    icon: MapIcon,
    title: 'Personalized 5-Phase Roadmap Generator',
    summary:
      'Creates structured 30-day, 60-day, 90-day, or custom duration learning plans calibrated to your weekly study budget and learning style.',
    highlights: [
      'Organizes milestones into Foundation → Interview Prep phases',
      'Supports adding, editing, reordering, pausing, and completing tasks',
      'Includes timeline schedule view and automatic progress logging',
    ],
  },
  {
    icon: FolderGit2,
    title: 'Targeted Project Recommendations',
    summary:
      'Avoid generic to-do apps. Generate realistic beginner, intermediate, and advanced project blueprints scoped to close your exact missing skill gaps.',
    highlights: [
      'Includes problem statement, milestones, and deliverables',
      'Avoids duplicating projects already in your portfolio',
      'Converts any blueprint into an active tracked build in one click',
    ],
  },
  {
    icon: Briefcase,
    title: 'AI Portfolio & Repository Reviewer',
    summary:
      'Evaluate your GitHub links, tech stack choices, and stated achievements against your target engineering role to uncover missing documentation or features.',
    highlights: [
      'Scores role relevance and technical complexity',
      'Identifies missing tests, observability, or README diagrams',
      'Generates concrete engineering improvements before interviews',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Context-Aware AI Career Coach',
    summary:
      'Multi-turn mentorship grounded in your real skill inventory, latest gap diagnostic, active roadmap tasks, and portfolio projects.',
    highlights: [
      'Persists conversation threads across sessions',
      'Answers system design, study sequence, and interview questions',
      'Never fabricates external links or guarantees job offers',
    ],
  },
  {
    icon: Compass,
    title: 'Career Role Explorer & Analytics',
    summary:
      'Inspect 15 curated technical career paths side-by-side and monitor readiness score trends, category breakdowns, and study consistency.',
    highlights: [
      'Side-by-side skill overlap comparison between any 2 roles',
      'Interactive readiness trend charts and weekly study logs',
      'Official documentation library with search-suggestion labels',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <PublicHeader />

      <main className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
        <div className="max-w-3xl mb-14">
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400 mb-2">
            Platform Architecture & Capabilities
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            Every workflow engineered for measurable career readiness
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            SkillGraph AI combines transparent weighted math with Gemini AI synthesis and PostgreSQL Row-Level Security so every insight reflects your real skills and projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {mod.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {mod.summary}
                  </p>
                </div>
                <ul className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  {mod.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">·</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-slate-900 text-white p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
              <BarChart3 className="w-4 h-4" />
              VERCEL + SUPABASE + GEMINI
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-1">
              Start mapping your skill graph today
            </h2>
            <p className="text-sm text-slate-300">
              Create your account or browse all 15 supported technical career paths without signing in.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Explore Careers
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
