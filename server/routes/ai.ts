import express from 'express';
import { z } from 'zod';
import { getAllCareerRoles } from '../../src/shared/catalogData.ts';
import type { CareerRole, UserProject } from '../../src/shared/types.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import {
  evaluatePortfolioProjectAI,
  generateProjectRecommendationsAI,
  runCareerCoachChatAI,
} from '../services/geminiService.ts';

export const aiRouter = express.Router();

const projectInputSchema = z.object({
  id: z.string().max(128).default('p'),
  userId: z.string().max(128).default('u'),
  title: z.string().min(1).max(140),
  description: z.string().min(1).max(2000),
  techStack: z.array(z.string().max(60)).max(20).optional(),
  skillsDemonstrated: z.array(z.string().max(60)).max(20).optional(),
  githubUrl: z.string().max(400).optional(),
  liveUrl: z.string().max(400).optional(),
  status: z.enum(['idea', 'in_progress', 'completed']).default('in_progress'),
  userRole: z.string().max(100).optional(),
  achievements: z.string().max(1000).optional(),
});

aiRouter.post(
  '/project-recommendations',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      targetRoleId: z.string().min(1).max(80),
      customRole: z.any().optional(),
      missingSkills: z.array(z.string().max(80)).max(25).default([]),
      skillsToImprove: z.array(z.string().max(80)).max(25).default([]),
      existingSkills: z.array(z.string().max(80)).max(50).default([]),
      existingProjects: z.array(z.string().max(140)).max(30).default([]),
      roadmapFocus: z.string().max(240).optional(),
    });

    const data = schema.parse(req.body);
    const allRoles = getAllCareerRoles(data.customRole ? [data.customRole as CareerRole] : []);
    const role = allRoles.find((r) => r.id === data.targetRoleId);
    if (!role) {
      throw new AppError(404, 'Career role not found.', 'ROLE_NOT_FOUND');
    }

    const projects = await generateProjectRecommendationsAI({
      role,
      missingSkills: data.missingSkills,
      skillsToImprove: data.skillsToImprove,
      existingSkills: data.existingSkills,
      existingProjects: data.existingProjects,
      roadmapFocus: data.roadmapFocus,
    });
    res.json({ projects });
  })
);

aiRouter.post(
  '/portfolio-review',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      project: projectInputSchema,
      targetRoleName: z.string().min(1).max(120),
    });

    const data = schema.parse(req.body);
    const review = await evaluatePortfolioProjectAI({
      project: data.project as UserProject,
      targetRoleName: data.targetRoleName,
    });
    res.json({ review });
  })
);

aiRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      message: z.string().min(1).max(4000),
      history: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string().max(12000),
          })
        )
        .max(20)
        .default([]),
      context: z.object({
        displayName: z.string().max(120).default('Student'),
        targetRoleName: z.string().max(120).default('Software Engineer'),
        skills: z
          .array(
            z.object({
              name: z.string().max(80),
              proficiency: z.number().min(1).max(5),
              currentlyLearning: z.boolean().optional(),
            })
          )
          .max(60)
          .default([]),
        topGaps: z
          .array(
            z.object({
              skillName: z.string().max(80),
              priority: z.string().max(20),
              current: z.number(),
              target: z.number(),
            })
          )
          .max(20)
          .default([]),
        activeRoadmapTitle: z.string().max(160).optional(),
        pendingTasks: z.array(z.string().max(160)).max(15).optional(),
        projects: z.array(z.string().max(160)).max(15).optional(),
      }),
    });

    const data = schema.parse(req.body);
    const reply = await runCareerCoachChatAI({
      message: data.message,
      history: data.history,
      context: data.context,
    });
    res.json({ reply });
  })
);
