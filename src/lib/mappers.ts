import type {
  AIAnalysisReportPayload,
  ChatConversation,
  ChatMessage,
  GapItemResult,
  PortfolioAIReview,
  ProficiencyLevel,
  ProgressRecord,
  Roadmap,
  RoadmapPhase,
  RoadmapTask,
  SavedResource,
  SkillGapAnalysis,
  UserProfile,
  UserProject,
  UserSkill,
} from '@/shared/types';

export function mapProfileRow(row: Record<string, unknown>): UserProfile {
  return {
    uid: String(row.id || ''),
    email: String(row.email || ''),
    displayName: String(row.display_name || 'Student'),
    photoURL: row.avatar_url ? String(row.avatar_url) : undefined,
    role: 'user',
    onboardingCompleted: Boolean(row.onboarding_completed),
    college: String(row.college || ''),
    degree: String(row.degree || ''),
    currentYear: String(row.current_year || ''),
    graduationYear: String(row.graduation_year || ''),
    country: String(row.country || ''),
    targetRoleId: String(row.target_role_id || ''),
    targetRoleName: String(row.target_role_name || ''),
    careerDomain: String(row.career_domain || ''),
    targetCompanies: Array.isArray(row.target_companies) ? (row.target_companies as string[]) : [],
    desiredIndustry: String(row.desired_industry || ''),
    jobGoal: String(row.job_goal || ''),
    hoursPerWeek: Number(row.hours_per_week || 10),
    learningStyle: String(row.learning_style || 'Hands-on projects & official docs'),
    budgetPreference: (row.budget_preference as UserProfile['budgetPreference']) || 'free_preferred',
    preferredLanguage: String(row.preferred_language || 'English'),
    learningPace: (row.learning_pace as UserProfile['learningPace']) || 'steady',
    streakDays: Number(row.streak_days || 0),
    totalHoursStudied: Number(row.total_hours_studied || 0),
    portfolioPublic: Boolean(row.portfolio_public),
    portfolioSlug: row.portfolio_slug ? String(row.portfolio_slug) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUserSkillRow(row: Record<string, unknown>): UserSkill {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    category: String(row.category),
    proficiency: Math.min(5, Math.max(1, Number(row.proficiency || 1))) as ProficiencyLevel,
    experienceMonths: Number(row.experience_months || 0),
    lastPracticed: row.last_practiced ? String(row.last_practiced) : '',
    confidence: row.confidence ? (Number(row.confidence) as ProficiencyLevel) : undefined,
    evidence: row.evidence ? String(row.evidence) : '',
    linkedProjectId: row.linked_project_id ? String(row.linked_project_id) : undefined,
    currentlyLearning: Boolean(row.currently_learning),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProjectRow(row: Record<string, unknown>): UserProject {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    description: String(row.description || ''),
    techStack: Array.isArray(row.tech_stack) ? (row.tech_stack as string[]) : [],
    skillsDemonstrated: Array.isArray(row.skills_demonstrated)
      ? (row.skills_demonstrated as string[])
      : [],
    githubUrl: row.github_url ? String(row.github_url) : '',
    liveUrl: row.live_url ? String(row.live_url) : '',
    status: (row.status as UserProject['status']) || 'in_progress',
    userRole: row.user_role ? String(row.user_role) : 'Developer',
    achievements: row.achievements ? String(row.achievements) : '',
    aiReview: (row.ai_review as PortfolioAIReview | undefined) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAnalysisItemRow(row: Record<string, unknown>): GapItemResult {
  return {
    skillName: String(row.skill_name),
    category: String(row.category),
    tier: (row.tier as GapItemResult['tier']) || 'required',
    currentProficiency: Number(row.current_proficiency || 0),
    targetProficiency: Number(row.target_proficiency || 3),
    importanceWeight: Number(row.importance_weight || 5),
    gapScore: Number(row.gap_score || 0),
    weightedImpact: Number(row.weighted_impact || 0),
    priority: (row.priority as GapItemResult['priority']) || 'medium',
    status: (row.status as GapItemResult['status']) || 'missing',
    demonstratedInProject: Boolean(row.demonstrated_in_project),
    estimatedHours: Number(row.estimated_hours || 0),
    reasonMatters: row.reason_matters ? String(row.reason_matters) : undefined,
    learningApproach: row.learning_approach ? String(row.learning_approach) : undefined,
    recommendedProject: row.recommended_project ? String(row.recommended_project) : undefined,
    resourceSuggestion: row.resource_suggestion ? String(row.resource_suggestion) : undefined,
  };
}

export function mapAnalysisRow(
  row: Record<string, unknown>,
  itemRows: Record<string, unknown>[]
): SkillGapAnalysis {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    targetRoleId: String(row.target_role_id),
    targetRoleName: String(row.target_role_name),
    readinessScore: Number(row.readiness_score || 0),
    overallMatchPercentage: Number(row.overall_match_percentage || 0),
    matchedCount: Number(row.matched_count || 0),
    improveCount: Number(row.improve_count || 0),
    missingCount: Number(row.missing_count || 0),
    estimatedHours: Number(row.estimated_hours || 0),
    methodology: String(row.methodology || ''),
    gapItems: itemRows.map(mapAnalysisItemRow),
    aiReport: (row.ai_report as AIAnalysisReportPayload | undefined) ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapRoadmapRow(row: Record<string, unknown>): Roadmap {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    targetRoleId: String(row.target_role_id),
    targetRoleName: String(row.target_role_name),
    durationDays: Number(row.duration_days || 30),
    hoursPerWeek: Number(row.hours_per_week || 10),
    status: (row.status as Roadmap['status']) || 'active',
    phases: Array.isArray(row.phases) ? (row.phases as RoadmapPhase[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRoadmapTaskRow(row: Record<string, unknown>): RoadmapTask {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    roadmapId: String(row.roadmap_id),
    phaseIndex: Number(row.phase_index || 1),
    phaseName: String(row.phase_name || 'Foundation'),
    title: String(row.title),
    description: row.description ? String(row.description) : '',
    skillName: String(row.skill_name || 'Core Engineering'),
    priority: (row.priority as RoadmapTask['priority']) || 'medium',
    estimatedHours: Number(row.estimated_hours || 3),
    startDate: row.start_date ? String(row.start_date) : undefined,
    dueDate: row.due_date ? String(row.due_date) : undefined,
    learningResource: row.learning_resource ? String(row.learning_resource) : '',
    assignment: row.assignment ? String(row.assignment) : '',
    status: (row.status as RoadmapTask['status']) || 'not_started',
    orderIndex: Number(row.order_index || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSavedResourceRow(row: Record<string, unknown>): SavedResource {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    resourceId: String(row.resource_id),
    title: String(row.title),
    skill: String(row.skill),
    category: String(row.category),
    provider: row.provider ? String(row.provider) : '',
    url: row.url ? String(row.url) : '',
    isSearchSuggestion: Boolean(row.is_search_suggestion),
    isFree: Boolean(row.is_free),
    difficulty: row.difficulty ? String(row.difficulty) : 'Beginner',
    createdAt: row.created_at,
  };
}

export function mapProgressRow(row: Record<string, unknown>): ProgressRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    date: String(row.record_date || ''),
    hoursStudied: Number(row.hours_studied || 0),
    tasksCompleted: Number(row.tasks_completed || 0),
    skillsImproved: Number(row.skills_improved || 0),
    readinessScore: row.readiness_score !== null && row.readiness_score !== undefined ? Number(row.readiness_score) : undefined,
    note: row.note ? String(row.note) : '',
    createdAt: row.created_at,
  };
}

export function mapConversationRow(row: Record<string, unknown>): ChatConversation {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    targetRoleName: row.target_role_name ? String(row.target_role_name) : '',
    messageCount: Number(row.message_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapChatMessageRow(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    conversationId: String(row.conversation_id),
    role: (row.role as ChatMessage['role']) || 'user',
    content: String(row.content),
    createdAt: row.created_at,
  };
}
