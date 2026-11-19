import { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  ArrowLeftRight,
  CheckCircle2,
  Download,
  Info,
  LayoutGrid,
  Loader2,
  Play,
  RefreshCw,
  Table2,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ReportSkeleton } from '../components/Skeleton';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { AppRoute } from '../layouts/AppShell';
import { runSkillGapAnalysisAPI } from '../services/apiClient';
import {
  addProgressRecord,
  createNotification,
  deleteSkillGapAnalysis,
  saveSkillGapAnalysis,
} from '../services/firestoreService';
import type { SkillGapAnalysis } from '../shared/types';

interface AnalysisPageProps {
  onNavigate: (route: AppRoute) => void;
}

export function AnalysisPage({ onNavigate }: AnalysisPageProps) {
  const { user, profile, skills, projects, analyses, careerRoles } = useApp();
  const { notify } = useToast();

  const [selectedRoleId, setSelectedRoleId] = useState(profile?.targetRoleId || 'sde');
  const [running, setRunning] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [gapViewMode, setGapViewMode] = useState<'cards' | 'table'>('cards');
  const [confirmDelete, setConfirmDelete] = useState<SkillGapAnalysis | null>(null);

  const activeAnalysis = analyses.find((a) => a.id === activeId) || analyses[0] || null;
  const compareAnalysis = compareId ? analyses.find((a) => a.id === compareId) || null : null;

  const missingSkills = useMemo(
    () => (activeAnalysis?.gapItems || []).filter((g) => g.status === 'missing'),
    [activeAnalysis]
  );
  const improveSkills = useMemo(
    () => (activeAnalysis?.gapItems || []).filter((g) => g.status === 'needs_improvement'),
    [activeAnalysis]
  );

  const comparisonDiff = useMemo(() => {
    if (!activeAnalysis || !compareAnalysis || compareAnalysis.id === activeAnalysis.id) {
      return null;
    }
    const prevMap = new Map(compareAnalysis.gapItems.map((g) => [g.skillName.toLowerCase(), g]));
    const improvedSkills: string[] = [];
    for (const curr of activeAnalysis.gapItems) {
      const prev = prevMap.get(curr.skillName.toLowerCase());
      if (prev && (curr.currentProficiency > prev.currentProficiency || curr.gapScore < prev.gapScore)) {
        improvedSkills.push(curr.skillName);
      }
    }
    return { improvedSkills };
  }, [activeAnalysis, compareAnalysis]);

  const handleRunAnalysis = async (roleOverrideId?: string) => {
    if (!user) return;
    setRunning(true);
    try {
      const targetId = roleOverrideId || selectedRoleId;
      const role = careerRoles.find((r) => r.id === targetId) || careerRoles[0];
      const res = await runSkillGapAnalysisAPI({
        targetRoleId: role.id,
        customRole: role.isCustom ? role : undefined,
        profile: profile || {},
        skills,
        projects,
      });

      const savedId = await saveSkillGapAnalysis(user.uid, {
        targetRoleId: res.analysis.targetRoleId,
        targetRoleName: res.analysis.targetRoleName,
        readinessScore: res.analysis.readinessScore,
        overallMatchPercentage: res.analysis.overallMatchPercentage,
        matchedCount: res.analysis.matchedCount,
        improveCount: res.analysis.improveCount,
        missingCount: res.analysis.missingCount,
        estimatedHours: res.analysis.estimatedHours,
        methodology: res.analysis.methodology,
        gapItems: res.analysis.gapItems,
        aiReport: res.analysis.aiReport,
      });

      await addProgressRecord(user.uid, {
        date: new Date().toISOString().slice(0, 10),
        hoursStudied: 0,
        tasksCompleted: 0,
        skillsImproved: res.analysis.matchedCount,
        readinessScore: res.analysis.readinessScore,
        note: `Skill gap analysis for ${res.analysis.targetRoleName}`,
      });

      await createNotification(
        user.uid,
        'Analysis Report Ready',
        `${res.analysis.targetRoleName}: ${res.analysis.readinessScore}% readiness score (${res.analysis.overallMatchPercentage}% weighted skill match).`,
        'analysis'
      );

      setActiveId(savedId);
      notify('AI Skill Gap Analysis completed and saved!', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Analysis failed.', 'error');
    } finally {
      setRunning(false);
    }
  };

  const handleExportPdf = (report: SkillGapAnalysis) => {
    const doc = new jsPDF();
    let y = 16;
    const addLine = (text: string, size = 10, bold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, 180) as string[];
      for (const line of lines) {
        if (y > 276) {
          doc.addPage();
          y = 16;
        }
        doc.text(line, 14, y);
        y += size * 0.48 + 1.5;
      }
    };

    addLine('SkillGraph AI — Career Readiness & Skill Gap Report', 16, true);
    addLine(`Candidate: ${profile?.displayName || 'Candidate'} | Target Role: ${report.targetRoleName}`, 10);
    addLine(
      `Readiness Score: ${report.readinessScore}% | Weighted Match: ${report.overallMatchPercentage}% | Est. Study: ${report.estimatedHours}h`,
      10,
      true
    );
    y += 3;

    if (report.aiReport) {
      addLine('Executive Overview', 12, true);
      addLine(report.aiReport.executiveOverview);
      y += 2;

      addLine('30-Day Action Plan', 12, true);
      report.aiReport.thirtyDayActionPlan.forEach((step, idx) => addLine(`${idx + 1}. ${step}`));
      y += 2;
    }

    addLine('Prioritized Skill Gaps', 12, true);
    report.gapItems.forEach((g) => {
      addLine(
        `- ${g.skillName} [${g.priority.toUpperCase()} · Weight ${g.importanceWeight}/10]: Current ${g.currentProficiency}/5 -> Target ${g.targetProficiency}/5 (Est ${g.estimatedHours}h)`
      );
    });
    y += 3;
    addLine(
      'Disclaimer: SkillGraph AI provides educational career guidance and estimates based on the information provided. It does not guarantee employment or represent official hiring criteria.',
      8
    );

    doc.save(`skillgraph-report-${report.targetRoleId}.pdf`);
    notify('PDF report downloaded.', 'success');
  };

  const handleDelete = async () => {
    if (!user || !confirmDelete) return;
    try {
      await deleteSkillGapAnalysis(user.uid, confirmDelete.id);
      if (activeId === confirmDelete.id) setActiveId(null);
      notify('Analysis report deleted.', 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to delete analysis.', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Runner Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">AI Skill Gap Analysis Engine</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Deterministic weighted scoring across {skills.length} logged skills and {projects.length} projects, enriched with Gemini career guidance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Select target career role"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            {careerRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => handleRunAnalysis()}
            disabled={running}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Analyzing Readiness...' : 'Analyze My Career Readiness'}
          </button>
        </div>
      </div>

      {/* Methodology Transparency */}
      <div className="bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">Transparent Scoring Methodology: </span>
          Beginner=1, Basic=2, Intermediate=3, Advanced=4, Expert=5. Weighted Match = Σ(min(UserLevel, TargetLevel) / TargetLevel × Weight) / Σ(Weight), plus up to +8% evidence bonus for skills demonstrated in portfolio projects. Approximate self-assessment indicator, not an employment guarantee.
        </div>
      </div>

      {running && <ReportSkeleton />}

      {/* Main Content Split */}
      {!running && !activeAnalysis ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
          <h3 className="text-base font-semibold mb-2">No Analysis Reports Generated Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
            Select your target career role above and click "Analyze My Career Readiness" to calculate your weighted skill match and generate your comprehensive report.
          </p>
        </div>
      ) : null}

      {!running && activeAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* History Sidebar */}
          <div className="lg:col-span-3 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              Analysis History ({analyses.length})
            </div>
            {analyses.map((a) => (
              <div
                key={a.id}
                className={`p-3.5 rounded-xl border transition-colors ${
                  activeAnalysis.id === a.id
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <button type="button" onClick={() => setActiveId(a.id)} className="w-full text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-mono tabular-nums text-base font-bold text-indigo-600 dark:text-indigo-400">
                      {a.readinessScore}%
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Match {a.overallMatchPercentage}%
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-900 dark:text-white mt-1 truncate">
                    {a.targetRoleName}
                  </div>
                </button>
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCompareId(compareId === a.id ? null : a.id)}
                    className="text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    {compareId === a.id ? 'Comparing' : 'Compare'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(a)}
                    aria-label="Delete report"
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Full Report */}
          <div className="lg:col-span-9 space-y-6">
            {/* Comparison Banner if selected */}
            {compareAnalysis && compareAnalysis.id !== activeAnalysis.id && (
              <div className="bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    Comparison vs. Previous Analysis ({compareAnalysis.targetRoleName})
                  </h4>
                  <button type="button" onClick={() => setCompareId(null)} className="text-xs text-slate-500 hover:underline">
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs font-mono tabular-nums">
                  <div>
                    <div className="text-slate-500">Readiness Delta</div>
                    <div className="text-base font-bold text-indigo-600">
                      {activeAnalysis.readinessScore - compareAnalysis.readinessScore >= 0 ? '+' : ''}
                      {activeAnalysis.readinessScore - compareAnalysis.readinessScore}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Skill Match Delta</div>
                    <div className="text-base font-bold">
                      {activeAnalysis.overallMatchPercentage - compareAnalysis.overallMatchPercentage >= 0 ? '+' : ''}
                      {activeAnalysis.overallMatchPercentage - compareAnalysis.overallMatchPercentage}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Hours Remaining Delta</div>
                    <div className="text-base font-bold">
                      {activeAnalysis.estimatedHours - compareAnalysis.estimatedHours}h
                    </div>
                  </div>
                </div>
                {comparisonDiff && comparisonDiff.improvedSkills.length > 0 && (
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    Skills improved since compared report: {comparisonDiff.improvedSkills.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Header Metrics & Actions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500">Target Career Benchmark</div>
                  <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    {activeAnalysis.targetRoleName}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleRunAnalysis(activeAnalysis.targetRoleId)}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-run Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPdf(activeAnalysis)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('roadmap')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Generate Roadmap From Gaps
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-5 font-mono tabular-nums">
                <div>
                  <div className="text-[11px] text-slate-500">Readiness</div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {activeAnalysis.readinessScore}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Weighted Match</div>
                  <div className="text-2xl font-bold">{activeAnalysis.overallMatchPercentage}%</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Matched</div>
                  <div className="text-2xl font-bold text-emerald-600">{activeAnalysis.matchedCount}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">To Improve</div>
                  <div className="text-2xl font-bold text-amber-600">{activeAnalysis.improveCount}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Missing</div>
                  <div className="text-2xl font-bold text-red-600">{activeAnalysis.missingCount}</div>
                </div>
              </div>
            </div>

            {/* Missing vs. Needs Improvement Quick Summary */}
            {(missingSkills.length > 0 || improveSkills.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                    Missing Skills ({missingSkills.length})
                  </h4>
                  {missingSkills.length === 0 ? (
                    <p className="text-xs text-slate-500">No missing required skills.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {missingSkills.map((g) => (
                        <li key={g.skillName} className="flex items-center justify-between font-mono">
                          <span className="font-sans font-medium text-slate-900 dark:text-white">{g.skillName}</span>
                          <span>Target {g.targetProficiency}/5 · Wt {g.importanceWeight}/10</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
                    Skills to Improve ({improveSkills.length})
                  </h4>
                  {improveSkills.length === 0 ? (
                    <p className="text-xs text-slate-500">No partial skill gaps.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {improveSkills.map((g) => (
                        <li key={g.skillName} className="flex items-center justify-between font-mono">
                          <span className="font-sans font-medium text-slate-900 dark:text-white">{g.skillName}</span>
                          <span>{g.currentProficiency}/5 → {g.targetProficiency}/5 · Wt {g.importanceWeight}/10</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* AI Narrative Sections */}
            {activeAnalysis.aiReport && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <h4 className="text-base font-semibold mb-2">01. Career Readiness Overview</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {activeAnalysis.aiReport.executiveOverview}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
                      02. Verified Strengths
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {activeAnalysis.aiReport.strengthsSummary.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">
                      03. Critical Skill Gap Insights
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {activeAnalysis.aiReport.criticalGapInsights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Detailed Gap Matrix with Cards / Table toggle */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-semibold">04. Skill-by-Skill Gap Matrix</h4>
                      <span className="text-xs font-mono text-slate-500">
                        Est. {activeAnalysis.estimatedHours}h total study
                      </span>
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setGapViewMode('cards')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${
                          gapViewMode === 'cards' ? 'bg-white dark:bg-slate-800 font-medium shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" /> Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setGapViewMode('table')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${
                          gapViewMode === 'table' ? 'bg-white dark:bg-slate-800 font-medium shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        <Table2 className="w-3.5 h-3.5" /> Table
                      </button>
                    </div>
                  </div>

                  {gapViewMode === 'cards' ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeAnalysis.gapItems.map((g) => (
                        <div key={g.skillName} className="p-4 sm:px-6 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {g.skillName}
                              </span>
                              <span className="text-xs text-slate-500">
                                {g.category} · {g.tier} · Wt {g.importanceWeight}/10
                              </span>
                              {g.demonstratedInProject && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" /> Project verified
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                              <span
                                className={
                                  g.priority === 'high'
                                    ? 'text-red-600 font-semibold'
                                    : g.priority === 'medium'
                                    ? 'text-amber-600 font-semibold'
                                    : g.priority === 'low'
                                    ? 'text-slate-500'
                                    : 'text-emerald-600 font-semibold'
                                }
                              >
                                {g.priority === 'met' ? 'MET' : `${g.priority.toUpperCase()} GAP`}
                              </span>
                              <span>
                                {g.currentProficiency}/5 → {g.targetProficiency}/5
                              </span>
                              <span className="text-slate-400">{g.estimatedHours}h</span>
                            </div>
                          </div>
                          {g.reasonMatters && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">{g.reasonMatters}</p>
                          )}
                          {(g.learningApproach || g.recommendedProject) && (
                            <p className="text-xs text-indigo-700 dark:text-indigo-300">
                              {g.learningApproach ? `Approach: ${g.learningApproach}` : ''}
                              {g.resourceSuggestion ? ` · Resource: ${g.resourceSuggestion}` : ''}
                              {g.recommendedProject ? ` · Suggested build: ${g.recommendedProject}` : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-3 px-4 font-semibold">Skill</th>
                            <th className="py-3 px-4 font-semibold">Tier</th>
                            <th className="py-3 px-4 font-semibold text-right">Weight</th>
                            <th className="py-3 px-4 font-semibold text-right">Current</th>
                            <th className="py-3 px-4 font-semibold text-right">Target</th>
                            <th className="py-3 px-4 font-semibold text-right">Priority</th>
                            <th className="py-3 px-4 font-semibold text-right">Est. Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {activeAnalysis.gapItems.map((g) => (
                            <tr key={g.skillName} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/60">
                              <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                {g.skillName}
                              </td>
                              <td className="py-3 px-4 text-slate-500">{g.tier}</td>
                              <td className="py-3 px-4 font-mono tabular-nums text-right">{g.importanceWeight}/10</td>
                              <td className="py-3 px-4 font-mono tabular-nums text-right">{g.currentProficiency}/5</td>
                              <td className="py-3 px-4 font-mono tabular-nums text-right">{g.targetProficiency}/5</td>
                              <td className="py-3 px-4 font-mono text-right uppercase">{g.priority}</td>
                              <td className="py-3 px-4 font-mono tabular-nums text-right">{g.estimatedHours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Sequence, Projects, Interview, Schedule, 30-day Plan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    <h4 className="text-sm font-semibold mb-3">05. Recommended Learning Sequence</h4>
                    <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4">
                      {activeAnalysis.aiReport.learningSequenceRationale.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    <h4 className="text-sm font-semibold mb-3">06. Portfolio & Interview Preparation</h4>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {activeAnalysis.aiReport.portfolioImprovements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                      {activeAnalysis.aiReport.interviewPreparation.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {activeAnalysis.aiReport.projectRecommendations.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    <h4 className="text-base font-semibold mb-4">07. Targeted Project Recommendations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeAnalysis.aiReport.projectRecommendations.map((proj) => (
                        <div
                          key={proj.title}
                          className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          <div className="font-semibold text-sm mb-1">{proj.title}</div>
                          <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mb-2">
                            Targets: {proj.targetSkills.join(', ')}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mb-1.5">{proj.scope}</p>
                          <p className="text-xs text-slate-500">Impact: {proj.impact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    <h4 className="text-sm font-semibold mb-3">08. Recommended Weekly Schedule</h4>
                    <div className="space-y-2.5 text-xs">
                      {activeAnalysis.aiReport.recommendedWeeklySchedule.map((blk, i) => (
                        <div
                          key={`${blk.dayOrBlock}-${i}`}
                          className="flex items-start justify-between gap-3 pb-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                        >
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">
                              {blk.dayOrBlock} · {blk.focusArea}
                            </div>
                            <div className="text-slate-500">{blk.activity}</div>
                          </div>
                          <span className="font-mono tabular-nums text-indigo-600 shrink-0">{blk.hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    <h4 className="text-sm font-semibold mb-3">09. 30-Day Action Plan & Career Advice</h4>
                    <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4 mb-4">
                      {activeAnalysis.aiReport.thirtyDayActionPlan.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <p className="text-xs text-slate-700 dark:text-slate-200 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {activeAnalysis.aiReport.careerAdvice}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                  SkillGraph AI provides educational career guidance and estimates based on the information provided. It does not guarantee employment or represent official hiring criteria.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete Analysis Report"
        description={`Delete the saved analysis report for "${confirmDelete?.targetRoleName}"?`}
        confirmLabel="Delete Report"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
