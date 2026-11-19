import { NextResponse } from 'next/server';

const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: true } | { allowed: false; response: NextResponse } {
  const now = Date.now();
  const timestamps = (buckets.get(key) || []).filter((ts) => now - ts < windowMs);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] || now;
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Too many requests. Please wait a moment before trying again.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      ),
    };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true };
}
