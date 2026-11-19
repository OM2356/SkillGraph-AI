import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  timestamps: number[];
}

export function createRateLimiter(options: { windowMs: number; maxRequests: number; keyPrefix: string }) {
  const store = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const identity = req.authUser?.uid || req.ip || 'anonymous';
    const key = `${options.keyPrefix}:${identity}`;
    const existing = store.get(key) || { timestamps: [] };
    const recent = existing.timestamps.filter((ts) => now - ts < options.windowMs);

    const resetEpochSec = Math.ceil((now + options.windowMs) / 1000);
    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Reset', String(resetEpochSec));

    if (recent.length >= options.maxRequests) {
      res.setHeader('X-RateLimit-Remaining', '0');
      res.status(429).json({
        error: 'Rate limit exceeded. Please wait a few moments before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    recent.push(now);
    store.set(key, { timestamps: recent });
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.maxRequests - recent.length)));
    next();
  };
}
