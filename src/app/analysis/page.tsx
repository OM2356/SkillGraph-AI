'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Download, History, Sparkles, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AppShell } from '@/components/AppShell';
import { ReportSkeleton } from '@/components/Skeleton';
import { useAppToast } from '@/components/Providers';
import { SEEDED_CAREER_ROLES } from '@/shared/catalogData';
import type { SkillGapAnalysis } from '@/shared/types';

function AnalysisWorkspaceContent() {
  const searchParams = useSearchParams();
  const { notify } = useAppToast();

  const [analyses, setAnalyses] = useState<SkillGapAnalysis[]>([]);
  const [selected, setSelected] = useState<SkillGapAnalysis | null>(null);
  const [targetRoleId, setTargetRoleId] = useState(
    searchParams.get('role') || SEEDED_CAREER_ROLES[1].id
  );
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [includeAIReport, setIncludeAIReport] = useState(true);
  const [aiWarning, setAiWarning] = useState('');

  async function fetchHistory() {
    setLoading(true);
    try {
      const [histRes, profRes] = await Promise.all([
        fetch('/api/analysis'),
        fetch('/api/profile'),
      ]);
      const histJson = await histRes.json();
      const profJson = profRes.ok ? await profRes.json() : null;
      const list: SkillGapAnalysis[] = histJson.analyses || [];
      setAnalyses(list);
      if (list.length > 0) setSelected(list[0]);
      if (!searchParams.get('role') && profJson?.profile?.targetRoleId) {
        setTargetRoleId(profJson.profile.targetRoleId);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAnalysis() {
    setRunning(true);
    setAiWarning('');
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRoleId, includeAIReport }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to run analysis');
      if (json.aiWarning) setAiWarning(json.aiWarning);
      const created: SkillGapAnalysis = json.analysis;
      setAnalyses((prev) => [created, ...prev]);
      setSelected(created);
      notify(`Analysis complete: ${created.readinessScore}% readiness for ${created.targetRoleName}`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to run analysis.', 'error');
    } finally {
      setRunning(false);
    }
  }

  async function deleteAnalysis(id: string) {
    const res = await fetch(`/api/analysis/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const next = analyses.filter((a) => a.id !== id);
      setAnalyses(next);
      if (selected?.id === id) setSelected(next[0] || null);
      notify('Analysis report deleted.', 'info');
    }
  }

  function exportPdf(report: SkillGapAnalysis) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`SkillGraph AI — ${report.targetRoleName}`, 14, 18);
    doc.setFontSize(11);
    doc.text(
      `Readiness: ${report.readinessScore}% | Match: ${report.overallMatchPercentage}% | Est. Hours: ${report.estimatedHours}h`,
      14,
      26
    );
    let y = 36;
    if (report.aiReport?.executiveOverview) {
      const lines = doc.splitTextToSize(report.aiReport.executiveOverview, 180);
      doc.text(lines, 14, y);
      y += lines.length * 6 + 6;
    }
    doc.setFontSize(12);
    doc.text('Skill Gaps & Priorities', 14, y);
    y += 8;
    doc.setFontSize(10);
    for (const g of report.gapItems.slice(0, 14)) {
      if (y > 275) {
        doc.addPage();
        y = 18;
      }
      doc.text(
        `- ${g.skillName}: ${g.currentProficiency}/${g.targetProficiency} (${g.priority}, ${g.estimatedHours}h)`,
        14,
        y
      );
      y += 6;
    }
    doc.save(`skillgraph-${report.targetRoleId}.pdf`);
  }

  const previousForComparison = analyses.find(
    (a) => selected && a.id !== selected.id && a.targetRoleId === selected.targetRoleId
  );

  return (
    <AppShell
      title="Skill Gap Analysis"
      subtitle="Deterministic weighted proficiency matching combined with personalized Gemini career architecture."
    >
      <div className="space-y-6">
        {/* Run Controls */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <select
              value={targetRoleId}
              onChange={(e) => setTargetRoleId(e.target.value)}
              aria-label="Select target career role"
              className="flex-1 min-w-[220px] px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              {SEEDED_CAREER_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.domain})
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeAIReport}
                onChange={(e) => setIncludeAIReport(e.target.checked)}
              />
              Include AI Career Report
            </label>
          </div>
          <button
            onClick={runAnalysis}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            {running ? 'Analyzing Skills...' : 'Run Skill Gap Analysis'}
          </button>
        </div>

        {aiWarning && (
          <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
            {aiWarning}
          </div>
        )}

        {loading || running ? (
          <ReportSkeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* History Sidebar */}
            <aside className="lg:col-span-4 space-y-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  Saved Analyses ({analyses.length})
                </h2>
                {analyses.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    No analyses generated yet. Select a target role above and click Run.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {analyses.map((a) => (
                      <div
                        key={a.id}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          selected?.id === a.id
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                        onClick={() => setSelected(a)}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {a.targetRoleName}
                          </div>
                          <div className="text-slate-500 font-mono tabular-nums mt-0.5">
                            {a.readinessScore}% ready ·{' '}
                            {typeof a.createdAt === 'string' ? a.createdAt.slice(0, 10) : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Link
                            href={`/analysis/${a.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 text-[11px] font-medium text-indigo-600 hover:underline"
                          >
                            Open
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAnalysis(a.id);
                            }}
                            aria-label="Delete analysis"
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            {/* Report Panel */}
            <section className="lg:col-span-8 space-y-6">
              {selected ? (
                <>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs text-slate-500">Diagnostic Report</div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                          {selected.targetRoleName}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportPdf(selected)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Download className="w-3.5 h-3.5" /> Export PDF
                        </button>
                        <Link
                          href={`/roadmap?role=${selected.targetRoleId}&analysisId=${selected.id}`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Generate Roadmap
                        </Link>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Readiness</div>
                        <div className="font-mono tabular-nums text-lg font-bold text-indigo-600">
                          {selected.readinessScore}%
                        </div>
                        {previousForComparison && (
                          <div className="text-[10px] font-mono tabular-nums text-slate-500">
                            vs prev: {selected.readinessScore - previousForComparison.readinessScore >= 0 ? '+' : ''}
                            {selected.readinessScore - previousForComparison.readinessScore}%
                          </div>
                        )}
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Skill Match</div>
                        <div className="font-mono tabular-nums text-lg font-bold">
                          {selected.overallMatchPercentage}%
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Matched</div>
                        <div className="font-mono tabular-nums text-lg font-bold text-emerald-600">
                          {selected.matchedCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">To Improve / Missing</div>
                        <div className="font-mono tabular-nums text-lg font-bold text-amber-600">
                          {selected.improveCount} / {selected.missingCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Est. Study</div>
                        <div className="font-mono tabular-nums text-lg font-bold">
                          {selected.estimatedHours}h
                        </div>
                      </div>
                    </div>

                    {selected.aiReport && (
                      <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                            Executive Career Overview
                          </h3>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {selected.aiReport.executiveOverview}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                              Key Strengths
                            </h4>
                            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                              {selected.aiReport.strengthsSummary.map((s, idx) => (
                                <li key={idx}>· {s}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1.5">
                              30-Day Action Plan
                            </h4>
                            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                              {selected.aiReport.thirtyDayActionPlan.slice(0, 5).map((step, idx) => (
                                <li key={idx}>· {step}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {selected.methodology}
                    </p>
                  </div>

                  {/* Skill Breakdown Table */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-semibold">Detailed Skill-by-Skill Matrix</h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selected.gapItems.map((item) => (
                        <div key={item.skillName} className="p-4 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                {item.skillName}
                              </span>
                              <span className="text-xs text-slate-500 ml-2">
                                {item.category} · {item.tier} · Wt {item.importanceWeight}/10
                              </span>
                            </div>
                            <div className="font-mono tabular-nums text-xs">
                              <span
                                className={
                                  item.status === 'matched'
                                    ? 'text-emerald-600 font-semibold'
                                    : item.status === 'needs_improvement'
                                    ? 'text-amber-600 font-semibold'
                                    : 'text-red-600 font-semibold'
                                }
                              >
                                {item.currentProficiency} / {item.targetProficiency}
                              </span>
                              {item.estimatedHours > 0 && (
                                <span className="text-slate-500 ml-2">({item.estimatedHours}h)</span>
                              )}
                            </div>
                          </div>
                          {item.reasonMatters && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {item.reasonMatters}
                            </p>
                          )}
                          {item.learningApproach && (
                            <p className="text-xs text-indigo-700 dark:text-indigo-400">
                              Approach: {item.learningApproach}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500">
                  Select a target career role and run your first analysis to generate a weighted diagnostic report.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <AnalysisWorkspaceContent />
    </Suspense>
  );
}
