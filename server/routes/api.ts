import express from 'express';
import { AppError } from '../middleware/errorHandler.ts';
import { createRateLimiter } from '../middleware/rateLimiter.ts';
import { requireAuth } from '../services/firebaseAuth.ts';
import { aiRouter } from './ai.ts';
import { analysisRouter, createRunAnalysisHandler } from './analysis.ts';
import { careersRouter } from './careers.ts';
import { resourcesRouter } from './resources.ts';
import { createGenerateRoadmapHandler, roadmapsRouter } from './roadmaps.ts';
import { userDataRouter } from './userData.ts';

export const apiRouter = express.Router();

const generalLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 90, keyPrefix: 'api' });
const aiLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20, keyPrefix: 'ai' });

apiRouter.use(generalLimiter);

// Public Health Check
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SkillGraph AI API',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    ),
  });
});

// Public Career Role Catalog & Learning Resources
apiRouter.use('/careers', careersRouter);
apiRouter.use('/', resourcesRouter);

// Authenticated AI Analysis & History
apiRouter.post('/analysis', requireAuth, aiLimiter, createRunAnalysisHandler());
apiRouter.use('/analysis', analysisRouter);

// Authenticated Roadmap Generation & CRUD
apiRouter.post('/roadmaps/generate', requireAuth, aiLimiter, createGenerateRoadmapHandler());
apiRouter.use('/roadmaps', roadmapsRouter);

// Authenticated AI Project Recommendations, Portfolio Review & Career Coach
apiRouter.use('/ai', requireAuth, aiLimiter, aiRouter);

// Authenticated User Profile, Skills, Projects & Progress CRUD
apiRouter.use('/', userDataRouter);

// Explicit API 404 fallback
apiRouter.use((req, _res, next) => {
  next(new AppError(404, `Endpoint not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
});
