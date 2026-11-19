'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ReportSkeleton } from '@/components/Skeleton';
import type { SkillGapAnalysis } from '@/shared/types';

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/analysis/${id}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Report not found');
        return j.analysis as SkillGapAnalysis;
      })
      .then(setAnalysis)
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load report'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppShell
      title={analysis ? `${analysis.targetRoleName} Report` : 'Analysis Report'}
      actions={
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Analyses
        </Link>
      }
    >
      {loading ? (
        <ReportSkeleton />
      ) : error ? (
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      ) : analysis ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{analysis.targetRoleName}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Readiness {analysis.readinessScore}% · Skill Match {analysis.overallMatchPercentage}% · {analysis.estimatedHours}h estimated effort
                </p>
              </div>
              <Link
                href={`/roadmap?role=${analysis.targetRoleId}`}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Create Roadmap from Report
              </Link>
            </div>
            {analysis.aiReport?.executiveOverview && (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {analysis.aiReport.executiveOverview}
              </p>
            )}
            {analysis.aiReport?.thirtyDayActionPlan && analysis.aiReport.thirtyDayActionPlan.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  30-Day Action Plan
                </h3>
                <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  {analysis.aiReport.thirtyDayActionPlan.map((step, i) => (
                    <li key={i}>· {step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
            {analysis.gapItems.map((g) => (
              <div key={g.skillName} className="p-4 flex items-center justify-between gap-4 text-sm">
                <div>
                  <div className="font-medium">{g.skillName}</div>
                  {g.learningApproach && <div className="text-xs text-slate-500 mt-0.5">{g.learningApproach}</div>}
                </div>
                <div className="font-mono tabular-nums text-xs shrink-0">
                  {g.currentProficiency}/{g.targetProficiency} ({g.priority})
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
