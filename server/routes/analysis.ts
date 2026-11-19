import express from 'express';
import { z } from 'zod';
import { getAllCareerRoles } from '../../src/shared/catalogData.ts';
import { calculateSkillGapAnalysis } from '../../src/shared/scoringEngine.ts';
import type { CareerRole, UserProject, UserSkill } from '../../src/shared/types.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import { requireAuth } from '../services/firebaseAuth.ts';
import { fsDeleteDoc, fsGetDoc, fsListCollection } from '../services/firestoreRestClient.ts';
import { generateGapAnalysisNarrative } from '../services/geminiService.ts';

export const analysisRouter = express.Router();

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

analysisRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const token = (req.headers.authorization || '').slice('Bearer '.length).trim();
    const analyses = await fsListCollection(`users/${uid}/analyses`, token);
    res.json({ count: analyses.length, analyses });
  })
);

analysisRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const id = String(req.params.id).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
    const token = (req.headers.authorization || '').slice('Bearer '.length).trim();
    const existing = await fsGetDoc(`users/${uid}/analyses/${id}`, token);
    if (!existing || existing.userId !== uid) {
      throw new AppError(404, 'Analysis report not found.', 'ANALYSIS_NOT_FOUND');
    }
    await fsDeleteDoc(`users/${uid}/analyses/${id}`, token);
    res.json({ deleted: true, id });
  })
);

export function createRunAnalysisHandler() {
  return asyncHandler(async (req, res) => {
    const schema = z.object({
      targetRoleId: z.string().min(1).max(80),
      customRole: z.any().optional(),
      profile: z
        .object({
          displayName: z.string().max(120).optional(),
          college: z.string().max(160).optional(),
          degree: z.string().max(120).optional(),
          currentYear: z.string().max(40).optional(),
          graduationYear: z.string().max(10).optional(),
          jobGoal: z.string().max(80).optional(),
          desiredIndustry: z.string().max(80).optional(),
          hoursPerWeek: z.number().min(1).max(100).optional(),
          learningStyle: z.string().max(60).optional(),
          budgetPreference: z.string().max(30).optional(),
        })
        .default({}),
      skills: z.array(skillInputSchema).max(100),
      projects: z.array(projectInputSchema).max(50).default([]),
    });

    const data = schema.parse(req.body);
    const allRoles = getAllCareerRoles(data.customRole ? [data.customRole as CareerRole] : []);
    const role = allRoles.find((r) => r.id === data.targetRoleId);
    if (!role) {
      throw new AppError(404, 'Target career role not found.', 'ROLE_NOT_FOUND');
    }

    const deterministic = calculateSkillGapAnalysis({
      role,
      userSkills: data.skills as UserSkill[],
      userProjects: data.projects as UserProject[],
      hoursPerWeek: data.profile.hoursPerWeek || 10,
    });

    const aiResult = await generateGapAnalysisNarrative({
      role,
      profile: data.profile as Record<string, unknown>,
      userSkills: data.skills as UserSkill[],
      userProjects: data.projects as UserProject[],
      readinessScore: deterministic.readinessScore,
      overallMatchPercentage: deterministic.overallMatchPercentage,
      estimatedHours: deterministic.estimatedHours,
      gapItems: deterministic.gapItems,
    });

    const enrichmentMap = new Map(
      aiResult.gapEnrichments.map((e) => [e.skillName.toLowerCase(), e])
    );

    const enrichedGaps = deterministic.gapItems.map((g) => {
      const enr = enrichmentMap.get(g.skillName.toLowerCase());
      return enr
        ? {
            ...g,
            reasonMatters: enr.reasonMatters,
            learningApproach: enr.learningApproach,
            recommendedProject: enr.recommendedProject,
            resourceSuggestion: enr.resourceSuggestion,
          }
        : g;
    });

    res.json({
      analysis: {
        ...deterministic,
        gapItems: enrichedGaps,
        aiReport: aiResult.report,
        disclaimer:
          'SkillGraph AI provides educational career guidance and estimates based on the information provided. It does not guarantee employment or represent official hiring criteria.',
      },
    });
  });
}
