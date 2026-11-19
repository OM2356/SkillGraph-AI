import assert from 'node:assert/strict';
import { calculateSkillGapAnalysis } from '../src/shared/scoringEngine';
import { SEEDED_CAREER_ROLES } from '../src/shared/catalogData';
import type { UserProject, UserSkill } from '../src/shared/types';

function makeSkill(name: string, proficiency: 1 | 2 | 3 | 4 | 5, linkedProjectId?: string): UserSkill {
  return {
    id: `skill-${name.toLowerCase().replace(/\s+/g, '-')}`,
    userId: 'user-test',
    name,
    category: 'Programming Languages',
    proficiency,
    currentlyLearning: false,
    linkedProjectId,
  };
}

function makeProject(id: string, title: string, techStack: string[], skillsDemonstrated: string[]): UserProject {
  return {
    id,
    userId: 'user-test',
    title,
    description: 'Test project for deterministic scoring',
    techStack,
    skillsDemonstrated,
    status: 'completed',
  };
}

function run() {
  const sdeRole = SEEDED_CAREER_ROLES.find((r) => r.id === 'sde');
  const fullStackRole = SEEDED_CAREER_ROLES.find((r) => r.id === 'full-stack-developer');
  const dataAnalystRole = SEEDED_CAREER_ROLES.find((r) => r.id === 'data-analyst');

  assert.ok(sdeRole, 'Expected sde role in catalog');
  assert.ok(fullStackRole, 'Expected full-stack-developer role in catalog');
  assert.ok(dataAnalystRole, 'Expected data-analyst role in catalog');
  assert.equal(SEEDED_CAREER_ROLES.length, 15, 'Expected 15 seeded career roles');

  // 1. Starter student with zero skills
  const starter = calculateSkillGapAnalysis({
    role: sdeRole,
    userSkills: [],
    userProjects: [],
    hoursPerWeek: 10,
  });
  assert.equal(starter.readinessScore, 0);
  assert.equal(starter.overallMatchPercentage, 0);
  assert.equal(starter.matchedCount, 0);
  assert.equal(
    starter.missingCount,
    sdeRole.requiredSkills.length + sdeRole.importantSkills.length + sdeRole.optionalSkills.length
  );
  assert.ok(starter.estimatedHours > 100);

  // 2. Mid-level student: verifies alternative matching ("Java" -> "Java or C++"), capping at target, and project bonus
  const midSkills: UserSkill[] = [
    makeSkill('Data Structures & Algorithms', 3), // target 4 -> needs improvement
    makeSkill('Java', 5), // exceeds target 4 -> capped at 4/4
    makeSkill('Object-Oriented Programming', 4), // met
    makeSkill('SQL', 3, 'proj-1'), // met + project evidence
    makeSkill('Git', 3), // met
  ];
  const midProjects: UserProject[] = [
    makeProject('proj-1', 'Order Ledger API', ['Java', 'PostgreSQL', 'SQL'], ['SQL', 'Object-Oriented Programming']),
  ];

  const mid = calculateSkillGapAnalysis({
    role: sdeRole,
    userSkills: midSkills,
    userProjects: midProjects,
    hoursPerWeek: 12,
  });

  const javaItem = mid.gapItems.find((i) => i.skillName === 'Java or C++');
  assert.ok(javaItem, 'Expected Java to match "Java or C++"');
  assert.equal(javaItem.currentProficiency, 5);
  assert.equal(javaItem.gapScore, 0, 'Exceeding target proficiency should yield 0 gap');
  assert.equal(javaItem.status, 'matched');
  assert.equal(javaItem.demonstratedInProject, true);

  assert.ok(
    mid.readinessScore > mid.overallMatchPercentage,
    'Project evidence should add positive readiness bonus over raw match percentage'
  );
  assert.ok(mid.readinessScore <= mid.overallMatchPercentage + 8, 'Project bonus must be capped at +8%');
  assert.ok(mid.matchedCount >= 4);
  assert.ok(mid.improveCount >= 1);
  assert.ok(mid.missingCount >= 1);

  // 3. Same mid-level profile evaluated against Data Analyst yields a meaningfully different score
  const crossRole = calculateSkillGapAnalysis({
    role: dataAnalystRole,
    userSkills: midSkills,
    userProjects: midProjects,
    hoursPerWeek: 12,
  });
  assert.notEqual(
    crossRole.readinessScore,
    mid.readinessScore,
    'Different target roles must produce distinct readiness scores for the same profile'
  );
  assert.ok(
    mid.readinessScore > crossRole.readinessScore,
    'Java/DSA-heavy profile should score higher for SDE than Data Analyst'
  );

  // 4. Near-ready Full Stack candidate meeting every requirement
  const fullStackSkills: UserSkill[] = [
    ...fullStackRole.requiredSkills,
    ...fullStackRole.importantSkills,
    ...fullStackRole.optionalSkills,
  ].map((req) => makeSkill(req.name, req.targetProficiency, 'proj-fs'));

  const fullStackProject = makeProject(
    'proj-fs',
    'SaaS Analytics Workspace',
    ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    fullStackRole.requiredSkills.map((r) => r.name)
  );

  const expert = calculateSkillGapAnalysis({
    role: fullStackRole,
    userSkills: fullStackSkills,
    userProjects: [fullStackProject],
    hoursPerWeek: 15,
  });
  assert.equal(expert.overallMatchPercentage, 100);
  assert.equal(expert.readinessScore, 100);
  assert.equal(expert.missingCount, 0);
  assert.equal(expert.improveCount, 0);
  assert.equal(expert.estimatedHours, 0);

  console.log('scoringEngine.test.ts: All assertions passed.');
}

run();
