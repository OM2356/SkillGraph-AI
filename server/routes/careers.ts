import express from 'express';
import { z } from 'zod';
import {
  CAREER_ROLE_DISCLAIMER,
  getAllCareerRoles,
  SEEDED_CAREER_ROLES,
} from '../../src/shared/catalogData.ts';
import { calculateSkillGapAnalysis } from '../../src/shared/scoringEngine.ts';
import type { CareerRole, UserProject, UserSkill } from '../../src/shared/types.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';

export const careersRouter = express.Router();

const skillInputSchema = z.object({
  id: z.string().max(128).default('s'),
  userId: z.string().max(128).default('u'),
  name: z.string().min(1).max(80),
  category: z.string().min(1).max(40),
  proficiency: z.number().int().min(1).max(5),
  experienceMonths: z.number().int().min(0).max(600).optional(),
  evidence: z.string().max(300).optional(),
  linkedProjectId: z.string().max(80).optional(),
  currentlyLearning: z.boolean().default(false),
});

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

careersRouter.get(
  '/',
  asyncHandler((req, res) => {
    const domain = typeof req.query.domain === 'string' ? req.query.domain.trim() : '';
    const seniority = typeof req.query.seniority === 'string' ? req.query.seniority.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    const roles = SEEDED_CAREER_ROLES.filter((role) => {
      if (domain && role.domain !== domain) return false;
      if (seniority && role.seniorityLevel !== seniority) return false;
      if (q) {
        const hay = `${role.name} ${role.domain} ${role.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    res.json({
      disclaimer: CAREER_ROLE_DISCLAIMER,
      count: roles.length,
      roles,
    });
  })
);

careersRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const role = SEEDED_CAREER_ROLES.find((r) => r.id === req.params.id);
    if (!role) {
      throw new AppError(404, 'Career role not found.', 'ROLE_NOT_FOUND');
    }
    res.json({ disclaimer: CAREER_ROLE_DISCLAIMER, role });
  })
);

careersRouter.post(
  '/compare',
  asyncHandler((req, res) => {
    const schema = z.object({
      roleIdA: z.string().min(1),
      roleIdB: z.string().min(1),
      userSkills: z.array(skillInputSchema).default([]),
      userProjects: z.array(projectInputSchema).default([]),
      hoursPerWeek: z.number().min(1).max(80).default(10),
      customRoles: z.array(z.any()).optional(),
    });

    const data = schema.parse(req.body);
    const allRoles = getAllCareerRoles((data.customRoles as CareerRole[]) || []);
    const roleA = allRoles.find((r) => r.id === data.roleIdA);
    const roleB = allRoles.find((r) => r.id === data.roleIdB);
    if (!roleA || !roleB) {
      throw new AppError(404, 'One or both selected career roles were not found.', 'ROLE_NOT_FOUND');
    }

    const analysisA = calculateSkillGapAnalysis({
      role: roleA,
      userSkills: data.userSkills as UserSkill[],
      userProjects: data.userProjects as UserProject[],
      hoursPerWeek: data.hoursPerWeek,
    });
    const analysisB = calculateSkillGapAnalysis({
      role: roleB,
      userSkills: data.userSkills as UserSkill[],
      userProjects: data.userProjects as UserProject[],
      hoursPerWeek: data.hoursPerWeek,
    });

    const recommendedRoleId =
      analysisA.readinessScore >= analysisB.readinessScore ? roleA.id : roleB.id;

    res.json({
      disclaimer: CAREER_ROLE_DISCLAIMER,
      comparison: {
        roleA: { role: roleA, analysis: analysisA },
        roleB: { role: roleB, analysis: analysisB },
        recommendedRoleId,
      },
    });
  })
);
