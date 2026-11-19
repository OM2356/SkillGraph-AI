import { auth } from '../lib/firebase';
import type {
  CareerRole,
  PortfolioAIReview,
  ProjectTemplate,
  RoadmapPhase,
  RoadmapTask,
  SkillGapAnalysis,
  UserProfile,
  UserProject,
  UserSkill,
} from '../shared/types';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in first to run AI analysis.');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function checkApiHealth(): Promise<{
  status: string;
  service: string;
  timestamp: string;
  geminiConfigured: boolean;
}> {
  const res = await fetch('/api/health');
  return handleResponse(res);
}

export async function compareRolesAPI(params: {
  roleIdA: string;
  roleIdB: string;
  userSkills: UserSkill[];
  userProjects: UserProject[];
  hoursPerWeek: number;
  customRoles?: CareerRole[];
}) {
  const res = await fetch('/api/careers/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleResponse<{
    disclaimer: string;
    comparison: {
      roleA: { role: CareerRole; analysis: Omit<SkillGapAnalysis, 'id' | 'userId'> };
      roleB: { role: CareerRole; analysis: Omit<SkillGapAnalysis, 'id' | 'userId'> };
      recommendedRoleId: string;
    };
  }>(res);
}

export async function runSkillGapAnalysisAPI(params: {
  targetRoleId: string;
  customRole?: CareerRole;
  profile: Partial<UserProfile>;
  skills: UserSkill[];
  projects: UserProject[];
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/analysis', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleResponse<{
    analysis: Omit<SkillGapAnalysis, 'id' | 'userId' | 'createdAt'> & { disclaimer: string };
  }>(res);
}

export async function generateRoadmapAPI(params: {
  targetRoleId: string;
  customRole?: CareerRole;
  durationDays: number;
  hoursPerWeek: number;
  learningStyle: string;
  budgetPreference: string;
  gapItems: unknown[];
  existingSkills: UserSkill[];
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/roadmaps/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleResponse<{
    roadmap: {
      title: string;
      targetRoleId: string;
      targetRoleName: string;
      durationDays: number;
      hoursPerWeek: number;
      phases: RoadmapPhase[];
      tasks: Array<Omit<RoadmapTask, 'id' | 'userId' | 'roadmapId' | 'createdAt' | 'updatedAt'>>;
    };
  }>(res);
}

export async function generateProjectRecommendationsAPI(params: {
  targetRoleId: string;
  customRole?: CareerRole;
  missingSkills: string[];
  skillsToImprove?: string[];
  existingSkills: string[];
  existingProjects?: string[];
  roadmapFocus?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/ai/project-recommendations', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleResponse<{ projects: ProjectTemplate[] }>(res);
}

export async function reviewPortfolioProjectAPI(params: {
  project: UserProject;
  targetRoleName: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/ai/portfolio-review', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleResponse<{ review: PortfolioAIReview }>(res);
}

export async function sendCoachMessageAPI(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: {
    displayName: string;
    targetRoleName: string;
    skills: Array<{ name: string; proficiency: number; currentlyLearning?: boolean }>;
    topGaps: Array<{ skillName: string; priority: string; current: number; target: number }>;
    activeRoadmapTitle?: string;
    pendingTasks?: string[];
    projects?: string[];
  };
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return handleResponse<{ reply: string }>(res);
}
