export type SkillCategory =
  | 'Programming Languages'
  | 'Frontend'
  | 'Backend'
  | 'Database'
  | 'AI/ML'
  | 'Data'
  | 'Cloud'
  | 'DevOps'
  | 'Cybersecurity'
  | 'Testing'
  | 'Tools'
  | 'Soft Skills';

export const SKILL_CATEGORIES: SkillCategory[] = [
  'Programming Languages',
  'Frontend',
  'Backend',
  'Database',
  'AI/ML',
  'Data',
  'Cloud',
  'DevOps',
  'Cybersecurity',
  'Testing',
  'Tools',
  'Soft Skills',
];

export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5;

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

export const FIELD_LIMITS = {
  displayNameMax: 120,
  collegeMax: 160,
  degreeMax: 120,
  skillNameMax: 80,
  evidenceMax: 300,
  projectTitleMax: 140,
  projectDescMax: 2000,
  urlMax: 400,
  roadmapTitleMax: 160,
  taskTitleMax: 160,
  taskDescMax: 1200,
  chatMessageMax: 12000,
  idPattern: /^[a-zA-Z0-9_\-]+$/,
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'admin';
  onboardingCompleted: boolean;
  college?: string;
  degree?: string;
  currentYear?: string;
  graduationYear?: string;
  country?: string;
  targetRoleId?: string;
  targetRoleName?: string;
  careerDomain?: string;
  targetCompanies?: string[];
  desiredIndustry?: string;
  jobGoal?: string;
  hoursPerWeek?: number;
  learningStyle?: string;
  budgetPreference?: 'free_only' | 'free_preferred' | 'paid_ok';
  preferredLanguage?: string;
  learningPace?: 'steady' | 'intensive' | 'flexible';
  streakDays?: number;
  totalHoursStudied?: number;
  portfolioPublic?: boolean;
  portfolioSlug?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserSkill {
  id: string;
  userId: string;
  name: string;
  category: SkillCategory | string;
  proficiency: ProficiencyLevel;
  experienceMonths?: number;
  lastPracticed?: string;
  confidence?: ProficiencyLevel;
  evidence?: string;
  linkedProjectId?: string;
  currentlyLearning: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PortfolioAIReview {
  relevanceScore: number;
  complexityAssessment: string;
  skillDemonstration: string;
  documentationFeedback: string;
  repoPresentation: string;
  missingFeatures: string[];
  actionableImprovements: string[];
  reviewedAt: string;
}

export interface UserProject {
  id: string;
  userId: string;
  title: string;
  description: string;
  techStack?: string[];
  skillsDemonstrated?: string[];
  githubUrl?: string;
  liveUrl?: string;
  status: 'idea' | 'in_progress' | 'completed';
  userRole?: string;
  achievements?: string;
  aiReview?: PortfolioAIReview;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RoleSkillRequirement {
  name: string;
  category: SkillCategory;
  targetProficiency: ProficiencyLevel;
  weight: number;
  tier: 'required' | 'important' | 'optional';
  estimatedBaseHours: number;
}

export interface ProjectTemplate {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedHours: number;
  problemStatement: string;
  objective: string;
  skillsCovered: string[];
  techStack: string[];
  features: string[];
  milestones: string[];
  deliverables: string[];
  portfolioValue?: string;
  reasoning?: string;
  githubTips: string;
  advancedExtensions: string[];
  roleIds: string[];
}

export interface LearningResourceItem {
  id: string;
  title: string;
  skill: string;
  category:
    | 'Official Documentation'
    | 'Free Courses'
    | 'YouTube'
    | 'Interactive Practice'
    | 'Coding Platforms'
    | 'Books'
    | 'Project Tutorials';
  provider: string;
  url: string;
  isSearchSuggestion: boolean;
  isFree: boolean;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  estimatedDuration: string;
}

export interface CareerRole {
  id: string;
  name: string;
  domain: string;
  seniorityLevel: 'Entry-Level / Intern' | 'Junior / Early Career' | 'Mid-Level';
  description: string;
  isPublished: boolean;
  requiredSkills: RoleSkillRequirement[];
  importantSkills: RoleSkillRequirement[];
  optionalSkills: RoleSkillRequirement[];
  exampleResponsibilities: string[];
  careerProgression: string[];
  suggestedProjectIds?: string[];
  isCustom?: boolean;
}

export interface GapItemResult {
  skillName: string;
  category: string;
  tier: 'required' | 'important' | 'optional';
  currentProficiency: number;
  targetProficiency: number;
  importanceWeight: number;
  gapScore: number;
  weightedImpact: number;
  priority: 'high' | 'medium' | 'low' | 'met';
  status: 'matched' | 'needs_improvement' | 'missing';
  demonstratedInProject: boolean;
  estimatedHours: number;
  reasonMatters?: string;
  learningApproach?: string;
  recommendedProject?: string;
  resourceSuggestion?: string;
}

export interface AIAnalysisReportPayload {
  executiveOverview: string;
  strengthsSummary: string[];
  criticalGapInsights: string[];
  learningSequenceRationale: string[];
  projectRecommendations: Array<{
    title: string;
    targetSkills: string[];
    scope: string;
    impact: string;
  }>;
  portfolioImprovements: string[];
  interviewPreparation: string[];
  recommendedWeeklySchedule: Array<{
    dayOrBlock: string;
    focusArea: string;
    hours: number;
    activity: string;
  }>;
  careerAdvice: string;
  thirtyDayActionPlan: string[];
}

export interface SkillGapAnalysis {
  id: string;
  userId: string;
  targetRoleId: string;
  targetRoleName: string;
  readinessScore: number;
  overallMatchPercentage: number;
  matchedCount: number;
  improveCount: number;
  missingCount: number;
  estimatedHours: number;
  methodology: string;
  gapItems: GapItemResult[];
  aiReport?: AIAnalysisReportPayload;
  createdAt?: unknown;
}

export interface RoadmapPhase {
  phaseIndex: number;
  name: string;
  goal: string;
  weekRange: string;
}

export interface Roadmap {
  id: string;
  userId: string;
  title: string;
  targetRoleId: string;
  targetRoleName: string;
  durationDays: number;
  hoursPerWeek?: number;
  status: 'active' | 'paused' | 'completed';
  phases: RoadmapPhase[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RoadmapTask {
  id: string;
  userId: string;
  roadmapId: string;
  phaseIndex: number;
  phaseName: string;
  title: string;
  description?: string;
  skillName: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours?: number;
  startDate?: string;
  dueDate?: string;
  learningResource?: string;
  assignment?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  orderIndex: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavedResource {
  id: string;
  userId: string;
  resourceId: string;
  title: string;
  skill: string;
  category: string;
  provider?: string;
  url?: string;
  isSearchSuggestion?: boolean;
  isFree: boolean;
  difficulty?: string;
  createdAt?: unknown;
}

export interface ProgressRecord {
  id: string;
  userId: string;
  date: string;
  hoursStudied: number;
  tasksCompleted: number;
  skillsImproved?: number;
  readinessScore?: number;
  note?: string;
  createdAt?: unknown;
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  targetRoleName?: string;
  messageCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChatMessage {
  id: string;
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: unknown;
}
