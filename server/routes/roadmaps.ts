import express from 'express';
import { z } from 'zod';
import { getAllCareerRoles } from '../../src/shared/catalogData.ts';
import { calculateSkillGapAnalysis } from '../../src/shared/scoringEngine.ts';
import type { CareerRole, UserSkill } from '../../src/shared/types.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import { requireAuth } from '../services/firebaseAuth.ts';
import {
  fsCommitWrite,
  fsDeleteDoc,
  fsGetDoc,
  fsListCollection,
  fsPatchFields,
} from '../services/firestoreRestClient.ts';
import { generatePersonalizedRoadmapAI } from '../services/geminiService.ts';

export const roadmapsRouter = express.Router();
roadmapsRouter.use(requireAuth);

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

export function createGenerateRoadmapHandler() {
  return asyncHandler(async (req, res) => {
    const schema = z.object({
      targetRoleId: z.string().min(1).max(80),
      customRole: z.any().optional(),
      durationDays: z.number().int().min(7).max(365),
      hoursPerWeek: z.number().min(1).max(80).default(10),
      learningStyle: z.string().max(60).default('Hands-on projects'),
      budgetPreference: z.string().max(40).default('free_preferred'),
      gapItems: z.array(z.any()).max(40).default([]),
      existingSkills: z.array(skillInputSchema).max(100).default([]),
    });

    const data = schema.parse(req.body);
    const allRoles = getAllCareerRoles(data.customRole ? [data.customRole as CareerRole] : []);
    const role = allRoles.find((r) => r.id === data.targetRoleId);
    if (!role) {
      throw new AppError(404, 'Target career role not found.', 'ROLE_NOT_FOUND');
    }

    const gapItems =
      data.gapItems.length > 0
        ? data.gapItems
        : calculateSkillGapAnalysis({
            role,
            userSkills: data.existingSkills as UserSkill[],
            userProjects: [],
            hoursPerWeek: data.hoursPerWeek,
          }).gapItems;

    const roadmap = await generatePersonalizedRoadmapAI({
      role,
      durationDays: data.durationDays,
      hoursPerWeek: data.hoursPerWeek,
      learningStyle: data.learningStyle,
      budgetPreference: data.budgetPreference,
      gapItems,
      existingSkills: data.existingSkills as UserSkill[],
    });

    const today = new Date();
    const tasksWithDates = roadmap.tasks.map((t, index) => {
      const start = new Date(today.getTime() + t.dayOffsetStart * 86400_000);
      const due = new Date(today.getTime() + Math.max(t.dayOffsetStart + 1, t.dayOffsetEnd) * 86400_000);
      return {
        phaseIndex: t.phaseIndex,
        phaseName: t.phaseName,
        title: t.title.slice(0, 160),
        description: t.description.slice(0, 1200),
        skillName: t.skillName.slice(0, 80),
        priority: t.priority,
        estimatedHours: t.estimatedHours,
        startDate: start.toISOString().slice(0, 10),
        dueDate: due.toISOString().slice(0, 10),
        learningResource: t.learningResource.slice(0, 300),
        assignment: t.assignment.slice(0, 400),
        status: 'not_started' as const,
        orderIndex: index,
      };
    });

    res.json({
      roadmap: {
        title: roadmap.title.slice(0, 160),
        targetRoleId: role.id,
        targetRoleName: role.name,
        durationDays: data.durationDays,
        hoursPerWeek: data.hoursPerWeek,
        phases: roadmap.phases,
        tasks: tasksWithDates,
      },
    });
  });
}

// --- Roadmap & Task REST CRUD ---

roadmapsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const token = getBearerToken(req);
    const roadmaps = await fsListCollection(`users/${uid}/roadmaps`, token);
    res.json({ count: roadmaps.length, roadmaps });
  })
);

const phaseSchema = z.object({
  phaseIndex: z.number().int().min(1).max(5),
  name: z.string().min(1).max(80),
  goal: z.string().max(240),
  weekRange: z.string().max(40),
});

const taskBodySchema = z.object({
  phaseIndex: z.number().int().min(1).max(5),
  phaseName: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  description: z.string().max(1200).default(''),
  skillName: z.string().min(1).max(80),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  estimatedHours: z.number().min(0).max(500).default(2),
  startDate: z.string().max(32).default(''),
  dueDate: z.string().max(32).default(''),
  learningResource: z.string().max(300).default(''),
  assignment: z.string().max(400).default(''),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).default('not_started'),
  orderIndex: z.number().int().min(0).max(500).default(0),
});

roadmapsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().min(1).max(160),
      targetRoleId: z.string().min(1).max(80),
      targetRoleName: z.string().min(1).max(120),
      durationDays: z.number().int().min(7).max(365),
      hoursPerWeek: z.number().min(1).max(100).optional(),
      status: z.enum(['active', 'paused', 'completed']).default('active'),
      phases: z.array(phaseSchema).max(8).default([]),
      tasks: z.array(taskBodySchema).max(60).default([]),
    });

    const data = schema.parse(req.body);
    const uid = req.authUser!.uid;
    const token = getBearerToken(req);
    const roadmapId = safeDocId(`rm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

    const { tasks, ...roadmapFields } = data;
    const savedRoadmap = await fsCommitWrite(
      `users/${uid}/roadmaps/${roadmapId}`,
      { id: roadmapId, userId: uid, ...roadmapFields },
      token,
      { isCreate: true, serverTimestampFields: ['createdAt', 'updatedAt'] }
    );

    const savedTasks = [];
    for (let i = 0; i < tasks.length; i++) {
      const taskId = safeDocId(`task_${i}_${Math.random().toString(36).slice(2, 7)}`);
      const savedTask = await fsCommitWrite(
        `users/${uid}/roadmaps/${roadmapId}/tasks/${taskId}`,
        { id: taskId, userId: uid, roadmapId, ...tasks[i], orderIndex: tasks[i].orderIndex ?? i },
        token,
        { isCreate: true, serverTimestampFields: ['createdAt', 'updatedAt'] }
      );
      savedTasks.push(savedTask);
    }

    res.status(201).json({ roadmap: savedRoadmap, tasks: savedTasks });
  })
);

roadmapsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().min(1).max(160).optional(),
      status: z.enum(['active', 'paused', 'completed']).optional(),
      phases: z.array(phaseSchema).max(8).optional(),
    });
    const updates = schema.parse(req.body);
    const uid = req.authUser!.uid;
    const roadmapId = safeDocId(String(req.params.id));
    const token = getBearerToken(req);

    const existing = await fsGetDoc(`users/${uid}/roadmaps/${roadmapId}`, token);
    if (!existing || existing.userId !== uid) {
      throw new AppError(404, 'Roadmap not found.', 'ROADMAP_NOT_FOUND');
    }

    const updated = await fsPatchFields(
      `users/${uid}/roadmaps/${roadmapId}`,
      updates as Record<string, unknown>,
      token
    );
    res.json({ roadmap: updated });
  })
);

roadmapsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const roadmapId = safeDocId(String(req.params.id));
    const token = getBearerToken(req);

    const existing = await fsGetDoc(`users/${uid}/roadmaps/${roadmapId}`, token);
    if (!existing || existing.userId !== uid) {
      throw new AppError(404, 'Roadmap not found.', 'ROADMAP_NOT_FOUND');
    }

    const tasks = await fsListCollection(`users/${uid}/roadmaps/${roadmapId}/tasks`, token);
    await Promise.all(
      tasks
        .map((t) => (typeof t.id === 'string' ? t.id : ''))
        .filter(Boolean)
        .map((tid) => fsDeleteDoc(`users/${uid}/roadmaps/${roadmapId}/tasks/${tid}`, token))
    );
    await fsDeleteDoc(`users/${uid}/roadmaps/${roadmapId}`, token);
    res.json({ deleted: true, id: roadmapId });
  })
);

roadmapsRouter.get(
  '/:id/tasks',
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const roadmapId = safeDocId(String(req.params.id));
    const token = getBearerToken(req);

    const existing = await fsGetDoc(`users/${uid}/roadmaps/${roadmapId}`, token);
    if (!existing || existing.userId !== uid) {
      throw new AppError(404, 'Roadmap not found.', 'ROADMAP_NOT_FOUND');
    }

    const tasks = await fsListCollection(`users/${uid}/roadmaps/${roadmapId}/tasks`, token);
    res.json({ count: tasks.length, tasks });
  })
);

roadmapsRouter.post(
  '/:id/tasks',
  asyncHandler(async (req, res) => {
    const data = taskBodySchema.parse(req.body);
    const uid = req.authUser!.uid;
    const roadmapId = safeDocId(String(req.params.id));
    const token = getBearerToken(req);

    const existing = await fsGetDoc(`users/${uid}/roadmaps/${roadmapId}`, token);
    if (!existing || existing.userId !== uid) {
      throw new AppError(404, 'Roadmap not found.', 'ROADMAP_NOT_FOUND');
    }

    const taskId = safeDocId(`task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const saved = await fsCommitWrite(
      `users/${uid}/roadmaps/${roadmapId}/tasks/${taskId}`,
      { id: taskId, userId: uid, roadmapId, ...data },
      token,
      { isCreate: true, serverTimestampFields: ['createdAt', 'updatedAt'] }
    );
    res.status(201).json({ task: saved });
  })
);

roadmapsRouter.patch(
  '/:id/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const data = taskBodySchema.partial().parse(req.body);
    const uid = req.authUser!.uid;
    const roadmapId = safeDocId(String(req.params.id));
    const taskId = safeDocId(String(req.params.taskId));
    const token = getBearerToken(req);

    const existing = await fsGetDoc(`users/${uid}/roadmaps/${roadmapId}/tasks/${taskId}`, token);
    if (!existing || existing.userId !== uid || existing.roadmapId !== roadmapId) {
      throw new AppError(404, 'Roadmap task not found.', 'TASK_NOT_FOUND');
    }

    const updated = await fsPatchFields(
      `users/${uid}/roadmaps/${roadmapId}/tasks/${taskId}`,
      data as Record<string, unknown>,
      token
    );
    res.json({ task: updated });
  })
);

roadmapsRouter.delete(
  '/:id/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const uid = req.authUser!.uid;
    const roadmapId = safeDocId(String(req.params.id));
    const taskId = safeDocId(String(req.params.taskId));
    const token = getBearerToken(req);

    const existing = await fsGetDoc(`users/${uid}/roadmaps/${roadmapId}/tasks/${taskId}`, token);
    if (!existing || existing.userId !== uid || existing.roadmapId !== roadmapId) {
      throw new AppError(404, 'Roadmap task not found.', 'TASK_NOT_FOUND');
    }

    await fsDeleteDoc(`users/${uid}/roadmaps/${roadmapId}/tasks/${taskId}`, token);
    res.json({ deleted: true, id: taskId });
  })
);
