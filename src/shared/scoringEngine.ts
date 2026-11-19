import type {
  CareerRole,
  GapItemResult,
  RoleSkillRequirement,
  UserProject,
  UserSkill,
} from './types';

export interface DeterministicAnalysisSummary {
  targetRoleId: string;
  targetRoleName: string;
  readinessScore: number;
  overallMatchPercentage: number;
  matchedCount: number;
  improveCount: number;
  missingCount: number;
  estimatedHours: number;
  estimatedWeeksAtPace: number;
  methodology: string;
  gapItems: GapItemResult[];
}

function normalizeSkillName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9+.#]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findMatchingUserSkill(
  reqSkillName: string,
  userSkills: UserSkill[]
): UserSkill | undefined {
  const targetNorm = normalizeSkillName(reqSkillName);
  const targetTokens = targetNorm.split(/\s+or\s+|\s*\/\s*|\s*&\s*|\s+/).filter((t) => t.length > 1);

  const exact = userSkills.find((s) => normalizeSkillName(s.name) === targetNorm);
  if (exact) return exact;

  const alternatives = reqSkillName
    .split(/\s+or\s+|\s*\/\s*|\(|\)/i)
    .map((p) => normalizeSkillName(p))
    .filter((p) => p.length >= 2);

  for (const alt of alternatives) {
    const match = userSkills.find((s) => {
      const uNorm = normalizeSkillName(s.name);
      return uNorm === alt || uNorm.includes(alt) || alt.includes(uNorm);
    });
    if (match) return match;
  }

  let bestMatch: UserSkill | undefined;
  let bestScore = 0;
  for (const s of userSkills) {
    const uNorm = normalizeSkillName(s.name);
    const uTokens = uNorm.split(' ').filter((t) => t.length > 1);
    const overlap = uTokens.filter((t) => targetTokens.includes(t)).length;
    if (overlap > 0 && overlap / Math.max(uTokens.length, 1) >= 0.6 && overlap > bestScore) {
      bestScore = overlap;
      bestMatch = s;
    }
  }
  return bestMatch;
}

function isSkillInProjects(reqSkillName: string, projects: UserProject[]): boolean {
  const alternatives = reqSkillName
    .split(/\s+or\s+|\s*\/\s*|\(|\)/i)
    .map((p) => normalizeSkillName(p))
    .filter((p) => p.length >= 2);

  return projects.some((proj) => {
    const combined = [
      ...(proj.skillsDemonstrated || []),
      ...(proj.techStack || []),
    ].map(normalizeSkillName);
    return alternatives.some((alt) =>
      combined.some((c) => c === alt || c.includes(alt) || alt.includes(c))
    );
  });
}

export function calculateSkillGapAnalysis(params: {
  role: CareerRole;
  userSkills: UserSkill[];
  userProjects: UserProject[];
  hoursPerWeek?: number;
}): DeterministicAnalysisSummary {
  const { role, userSkills, userProjects, hoursPerWeek = 10 } = params;

  const allRequirements: RoleSkillRequirement[] = [
    ...role.requiredSkills,
    ...role.importantSkills,
    ...role.optionalSkills,
  ];

  let totalWeight = 0;
  let earnedWeightedScore = 0;
  let projectEvidenceBonusWeight = 0;

  let matchedCount = 0;
  let improveCount = 0;
  let missingCount = 0;
  let estimatedHours = 0;

  const gapItems: GapItemResult[] = allRequirements.map((req) => {
    const matched = findMatchingUserSkill(req.name, userSkills);
    const currentProficiency = matched ? matched.proficiency : 0;
    const demonstratedInProject =
      isSkillInProjects(req.name, userProjects) || Boolean(matched?.linkedProjectId || matched?.evidence);

    const effectiveCap = Math.min(currentProficiency, req.targetProficiency);
    const ratio = req.targetProficiency > 0 ? effectiveCap / req.targetProficiency : 0;

    totalWeight += req.weight;
    earnedWeightedScore += ratio * req.weight;
    if (demonstratedInProject && currentProficiency > 0) {
      projectEvidenceBonusWeight += req.weight * 0.05;
    }

    const gapScore = Math.max(0, req.targetProficiency - currentProficiency);
    const weightedImpact = Number(((gapScore / Math.max(req.targetProficiency, 1)) * req.weight).toFixed(2));

    let status: GapItemResult['status'] = 'matched';
    if (currentProficiency === 0) {
      status = 'missing';
      missingCount += 1;
    } else if (gapScore > 0) {
      status = 'needs_improvement';
      improveCount += 1;
    } else {
      matchedCount += 1;
    }

    let priority: GapItemResult['priority'] = 'met';
    if (gapScore > 0) {
      if (req.tier === 'required' || weightedImpact >= 4.5) {
        priority = 'high';
      } else if (req.tier === 'important' || weightedImpact >= 2.0) {
        priority = 'medium';
      } else {
        priority = 'low';
      }
    }

    const itemHours =
      gapScore === 0
        ? 0
        : Math.max(4, Math.round((req.estimatedBaseHours * gapScore) / req.targetProficiency));
    estimatedHours += itemHours;

    return {
      skillName: req.name,
      category: req.category,
      tier: req.tier,
      currentProficiency,
      targetProficiency: req.targetProficiency,
      importanceWeight: req.weight,
      gapScore,
      weightedImpact,
      priority,
      status,
      demonstratedInProject,
      estimatedHours: itemHours,
    };
  });

  gapItems.sort((a, b) => {
    if (a.gapScore === 0 && b.gapScore > 0) return 1;
    if (b.gapScore === 0 && a.gapScore > 0) return -1;
    return b.weightedImpact - a.weightedImpact;
  });

  const overallMatchPercentage =
    totalWeight > 0 ? Math.round((earnedWeightedScore / totalWeight) * 100) : 0;

  const evidenceBonus = totalWeight > 0 ? Math.min(8, Math.round((projectEvidenceBonusWeight / totalWeight) * 100)) : 0;
  const readinessScore = Math.min(100, Math.max(0, overallMatchPercentage + evidenceBonus));

  const safeWeeklyHours = Math.max(2, hoursPerWeek);
  const estimatedWeeksAtPace = Math.ceil(estimatedHours / safeWeeklyHours);

  const methodology =
    'Weighted Skill Match = Sum(min(UserLevel, TargetLevel) / TargetLevel × RoleWeight) / Sum(RoleWeight), using Beginner=1 through Expert=5. Career Readiness combines Weighted Skill Match with up to +8% bonus for skills demonstrated in portfolio projects. This is an approximate educational self-assessment indicator, not an employment guarantee.';

  return {
    targetRoleId: role.id,
    targetRoleName: role.name,
    readinessScore,
    overallMatchPercentage,
    matchedCount,
    improveCount,
    missingCount,
    estimatedHours,
    estimatedWeeksAtPace,
    methodology,
    gapItems,
  };
}
