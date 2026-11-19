import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { errorHandler } from './server/middleware/errorHandler.ts';
import { apiRouter } from './server/routes/api.ts';

export async function createApp(options: { withFrontend?: boolean } = {}) {
  const app = express();
  const withFrontend = options.withFrontend ?? true;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use('/api', apiRouter);

  if (withFrontend) {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distDir = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        const indexFile = path.join(distDir, 'index.html');
        if (fs.existsSync(indexFile)) {
          res.sendFile(indexFile);
        } else {
          res.status(404).send('Build output not found.');
        }
      });
    }
  }

  // Centralized error handler middleware
  app.use(errorHandler);

  return app;
}

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const app = await createApp({ withFrontend: true });
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SkillGraph AI server listening on http://0.0.0.0:${PORT}`);
  });
}

const isEntrypoint =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
