import express from 'express';
import { z } from 'zod';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import { requireAuth } from '../services/firebaseAuth.ts';
import {
  fsCommitWrite,
  fsDeleteDoc,
  fsGetDoc,
  fsListCollection,
  fsPatchFields,
} from '../services/firestoreRestClient.ts';

export const userDataRouter = express.Router();

userDataRouter.use(['/profile', '/skills', '/projects', '/progress'], requireAuth);

function getBearerToken(req: express.Request): string {
  return (req.headers.authorization || '').slice('Bearer '.length).trim();
}

function safeDocId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
  if (!cleaned) {
    throw new AppError(400, 'Invalid resource identifier.', 'INVALID_ID');
  }
  return cleaned;
}

// --- Profile CRUD ---

userDataRouter.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const token = getBearerToken(req);
    const profile = await fsGetDoc(`users/${uid}`, token);
    res.json({ profile });
  })
);

userDataRouter.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      displayName: z.string().min(1).max(120).optional(),
      college: z.string().max(160).optional(),
      degree: z.string().max(120).optional(),
      currentYear: z.string().max(40).optional(),
      graduationYear: z.string().max(10).optional(),
      country: z.string().max(80).optional(),
      targetRoleId: z.string().max(80).optional(),
      targetRoleName: z.string().max(120).optional(),
      careerDomain: z.string().max(80).optional(),
      targetCompanies: z.array(z.string().max(60)).max(10).optional(),
      desiredIndustry: z.string().max(80).optional(),
      jobGoal: z.string().max(80).optional(),
      hoursPerWeek: z.number().min(0).max(100).optional(),
      learningStyle: z.string().max(60).optional(),
      budgetPreference: z.enum(['free_only', 'free_preferred', 'paid_ok']).optional(),
      preferredLanguage: z.string().max(40).optional(),
      learningPace: z.enum(['steady', 'intensive', 'flexible']).optional(),
      onboardingCompleted: z.boolean().optional(),
      portfolioPublic: z.boolean().optional(),
      portfolioSlug: z.string().max(80).optional(),
    });

    const updates = schema.parse(req.body);
    const uid = req.authUser!.uid;
    const token = getBearerToken(req);
    const updated = await fsPatchFields(`users/${uid}`, updates as Record<string, unknown>, token);
    res.json({ profile: updated });
  })
);

// --- Skills CRUD ---

userDataRouter.get(
  '/skills',
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const token = getBearerToken(req);
    const skills = await fsListCollection(`users/${uid}/skills`, token);
    res.json({ count: skills.length, skills });
  })
);

const skillBodySchema = z.object({
  name: z.string().min(1).max(80),
  category: z.string().min(1).max(40),
  proficiency: z.number().int().min(1).max(5),
  experienceMonths: z.number().int().min(0).max(600).default(0),
  lastPracticed: z.string().max(32).optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  evidence: z.string().max(300).default(''),
  linkedProjectId: z.string().max(80).default(''),
  currentlyLearning: z.boolean().default(false),
});

userDataRouter.post(
  '/skills',
  asyncHandler(async (req, res) => {
    const data = skillBodySchema.parse(req.body);
    const uid = req.authUser!.uid;
    const token = getBearerToken(req);
    const id = safeDocId(`skill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

    const saved = await fsCommitWrite(
      `users/${uid}/skills/${id}`,
      {
        id,
        userId: uid,
        ...data,
        lastPracticed: data.lastPracticed || new Date().toISOString().slice(0, 10),
        confidence: data.confidence ?? data.proficiency,
      },
      token,
      { isCreate: true, serverTimestampFields: ['createdAt', 'updatedAt'] }
    );
    res.status(201).json({ skill: saved });
  })
);

userDataRouter.put(
  '/skills/:id',
  asyncHandler(async (req, res) => {
    const data = skillBodySchema.partial().parse(req.body);
    const uid = req.authUser!.uid;
    const id = safeDocId(String(req.params.id));
    const token = getBearerToken(req);
    const existing = await fsGetDoc(`users/${uid}/skills/${id}`, token);
    if (!existing || existing.userId !== uid) {
      throw new AppError(404, 'Skill not found.', 'SKILL_NOT_FOUND');
    }

    const updated = await fsPatchFields(
      `users/${uid}/skills/${id}`,
      data as Record<string, unknown>,
      token
    );
    res.json({ skill: updated });
  })
);

userDataRouter.delete(
  '/skills/:id',
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const id = safeDocId(String(req.params.id));
    const token = getBearerToken(req);
    const existing = await fsGetDoc(`users/${uid}/skills/${id}`, token);
    if (!existing || existing.userId !== uid) {
      throw new AppError(404, 'Skill not found.', 'SKILL_NOT_FOUND');
    }
    await fsDeleteDoc(`users/${uid}/skills/${id}`, token);
    res.json({ deleted: true, id });
  })
);

// --- Projects CRUD ---

userDataRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const token = getBearerToken(req);
    const projects = await fsListCollection(`users/${uid}/projects`, token);
    res.json({ count: projects.length, projects });
  })
);

const projectBodySchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().min(1).max(2000),
  techStack: z.array(z.string().max(60)).max(20).default([]),
  skillsDemonstrated: z.array(z.string().max(60)).max(20).default([]),
  githubUrl: z.string().max(400).default(''),
  liveUrl: z.string().max(400).default(''),
  status: z.enum(['idea', 'in_progress', 'completed']).default('in_progress'),
  userRole: z.string().max(100).default('Developer'),
  achievements: z.string().max(1000).default(''),
});

userDataRouter.post(
  '/projects',
  asyncHandler(async (req, res) => {
    const data = projectBodySchema.parse(req.body);
    const uid = req.authUser!.uid;
    const token = getBearerToken(req);
    const id = safeDocId(`proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

    const saved = await fsCommitWrite(
      `users/${uid}/projects/${id}`,
      { id, userId: uid, ...data },
      token,
      { isCreate: true, serverTimestampFields: ['createdAt', 'updatedAt'] }
    );
    res.status(201).json({ project: saved });
  })
);

userDataRouter.put(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const data = projectBodySchema.partial().parse(req.body);
    const uid = req.authUser!.uid;
    const id = safeDocId(String(req.params.id));
    const token = getBearerToken(req);
    const existing = await fsGetDoc(`users/${uid}/projects/${id}`, token);
    if (!existing || existing.userId !== uid) {
      throw new AppError(404, 'Project not found.', 'PROJECT_NOT_FOUND');
    }
    const updated = await fsPatchFields(
      `users/${uid}/projects/${id}`,
      data as Record<string, unknown>,
      token
    );
    res.json({ project: updated });
  })
);

userDataRouter.delete(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const id = safeDocId(String(req.params.id));
    const token = getBearerToken(req);
    const existing = await fsGetDoc(`users/${uid}/projects/${id}`, token);
    if (!existing || existing.userId !== uid) {
      throw new AppError(404, 'Project not found.', 'PROJECT_NOT_FOUND');
    }
    await fsDeleteDoc(`users/${uid}/projects/${id}`, token);
    res.json({ deleted: true, id });
  })
);

// --- Progress Records ---

userDataRouter.get(
  '/progress',
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const token = getBearerToken(req);
    const records = await fsListCollection(`users/${uid}/progress`, token);
    res.json({ count: records.length, records });
  })
);

userDataRouter.post(
  '/progress',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      date: z.string().min(1).max(32),
      hoursStudied: z.number().min(0).max(24),
      tasksCompleted: z.number().int().min(0).max(100),
      skillsImproved: z.number().int().min(0).max(100).optional(),
      readinessScore: z.number().min(0).max(100).optional(),
      note: z.string().max(300).optional(),
    });
    const data = schema.parse(req.body);
    const uid = req.authUser!.uid;
    const token = getBearerToken(req);
    const id = safeDocId(`prog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

    const saved = await fsCommitWrite(
      `users/${uid}/progress/${id}`,
      { id, userId: uid, ...data },
      token,
      { isCreate: true, serverTimestampFields: ['createdAt'] }
    );
    res.status(201).json({ record: saved });
  })
);
