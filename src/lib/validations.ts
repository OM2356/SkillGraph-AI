import { z } from 'zod';
import { FIELD_LIMITS } from '@/shared/types';

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(FIELD_LIMITS.displayNameMax).optional(),
  college: z.string().trim().max(FIELD_LIMITS.collegeMax).optional(),
  degree: z.string().trim().max(FIELD_LIMITS.degreeMax).optional(),
  currentYear: z.string().trim().max(40).optional(),
  graduationYear: z.string().trim().max(20).optional(),
  country: z.string().trim().max(80).optional(),
  targetRoleId: z.string().trim().max(80).optional(),
  targetRoleName: z.string().trim().max(120).optional(),
  careerDomain: z.string().trim().max(120).optional(),
  targetCompanies: z.array(z.string().trim().max(80)).max(20).optional(),
  desiredIndustry: z.string().trim().max(120).optional(),
  jobGoal: z.string().trim().max(160).optional(),
  hoursPerWeek: z.coerce.number().int().min(1).max(80).optional(),
  learningStyle: z.string().trim().max(120).optional(),
  budgetPreference: z.enum(['free_only', 'free_preferred', 'paid_ok']).optional(),
  preferredLanguage: z.string().trim().max(60).optional(),
  learningPace: z.enum(['steady', 'intensive', 'flexible']).optional(),
  onboardingCompleted: z.boolean().optional(),
  portfolioPublic: z.boolean().optional(),
  portfolioSlug: z.string().trim().max(80).optional(),
});

export const skillCreateSchema = z.object({
  name: z.string().trim().min(1, 'Skill name is required').max(FIELD_LIMITS.skillNameMax),
  category: z.string().trim().min(1).max(60),
  proficiency: z.coerce.number().int().min(1).max(5),
  experienceMonths: z.coerce.number().int().min(0).max(600).default(0),
  lastPracticed: z.string().trim().max(40).optional().default(''),
  confidence: z.coerce.number().int().min(1).max(5).optional(),
  evidence: z.string().trim().max(FIELD_LIMITS.evidenceMax).optional().default(''),
  currentlyLearning: z.boolean().optional().default(false),
});

export const skillUpdateSchema = skillCreateSchema.partial();

export const projectCreateSchema = z.object({
  title: z.string().trim().min(2, 'Project title is required').max(FIELD_LIMITS.projectTitleMax),
  description: z.string().trim().min(10, 'Please include at least 10 characters describing the project').max(FIELD_LIMITS.projectDescMax),
  techStack: z.array(z.string().trim().max(60)).max(30).default([]),
  skillsDemonstrated: z.array(z.string().trim().max(80)).max(30).default([]),
  githubUrl: z.string().trim().max(FIELD_LIMITS.urlMax).optional().default(''),
  liveUrl: z.string().trim().max(FIELD_LIMITS.urlMax).optional().default(''),
  status: z.enum(['idea', 'in_progress', 'completed']).default('in_progress'),
  userRole: z.string().trim().max(80).optional().default('Developer'),
  achievements: z.string().trim().max(800).optional().default(''),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const analysisRequestSchema = z.object({
  targetRoleId: z.string().trim().min(1, 'Target career role is required').max(80),
  includeAIReport: z.boolean().optional().default(true),
});

export const roadmapCreateSchema = z.object({
  targetRoleId: z.string().trim().min(1).max(80),
  durationDays: z.coerce.number().int().min(7).max(365).default(30),
  hoursPerWeek: z.coerce.number().int().min(1).max(80).default(10),
  learningStyle: z.string().trim().max(120).optional().default('Hands-on projects & official docs'),
  budgetPreference: z.enum(['free_only', 'free_preferred', 'paid_ok']).optional().default('free_preferred'),
  analysisId: z.string().trim().max(80).optional(),
});

export const roadmapPatchSchema = z.object({
  status: z.enum(['active', 'paused', 'completed']).optional(),
  title: z.string().trim().min(2).max(FIELD_LIMITS.roadmapTitleMax).optional(),
});

export const roadmapTaskCreateSchema = z.object({
  phaseIndex: z.coerce.number().int().min(1).max(5).default(1),
  phaseName: z.string().trim().min(1).max(80).default('Foundation'),
  title: z.string().trim().min(2).max(FIELD_LIMITS.taskTitleMax),
  description: z.string().trim().max(FIELD_LIMITS.taskDescMax).optional().default(''),
  skillName: z.string().trim().min(1).max(80),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  estimatedHours: z.coerce.number().min(0.5).max(80).default(3),
  startDate: z.string().trim().max(30).optional(),
  dueDate: z.string().trim().max(30).optional(),
  learningResource: z.string().trim().max(300).optional().default(''),
  assignment: z.string().trim().max(400).optional().default(''),
});

export const roadmapTaskPatchSchema = z.object({
  title: z.string().trim().min(1).max(FIELD_LIMITS.taskTitleMax).optional(),
  description: z.string().trim().max(FIELD_LIMITS.taskDescMax).optional(),
  skillName: z.string().trim().min(1).max(80).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  estimatedHours: z.coerce.number().min(0.5).max(80).optional(),
  dueDate: z.string().trim().max(30).optional(),
  learningResource: z.string().trim().max(300).optional(),
  assignment: z.string().trim().max(400).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional(),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().trim().max(80).optional(),
  message: z.string().trim().min(1, 'Message cannot be empty').max(FIELD_LIMITS.chatMessageMax),
});

export const portfolioReviewSchema = z.object({
  projectId: z.string().trim().min(1).max(80),
});

export const projectRecommendationsSchema = z.object({
  targetRoleId: z.string().trim().min(1).max(80).optional(),
  useAI: z.boolean().optional().default(true),
});

export const progressLogSchema = z.object({
  recordDate: z.string().trim().max(30).optional(),
  hoursStudied: z.coerce.number().min(0).max(24),
  tasksCompleted: z.coerce.number().int().min(0).max(50).optional().default(0),
  skillsImproved: z.coerce.number().int().min(0).max(50).optional().default(0),
  note: z.string().trim().max(400).optional().default(''),
});
