import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rate limiting for serverless environments
 *
 * IMPORTANT: In-memory rate limiting does NOT work in serverless (Vercel) because:
 * - Each function invocation is stateless
 * - The Map gets reset on cold starts
 * - setInterval never runs in serverless
 *
 * For production rate limiting, use one of:
 * 1. Vercel Edge Config (https://vercel.com/docs/storage/edge-config)
 * 2. Upstash Redis (https://upstash.com/)
 * 3. Vercel's built-in rate limiting (https://vercel.com/docs/security/vercel-waf)
 *
 * For now, this is disabled to avoid false security.
 */

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  max: number;
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  /**
   * Custom key generator (default: uses IP address)
   */
  keyGenerator?: (req: VercelRequest) => string;
}

/**
 * Rate limiting middleware (DISABLED in serverless)
 *
 * This is a no-op in serverless environments. Rely on Vercel's built-in
 * rate limiting or implement using an external service.
 *
 * Returns true if rate limit exceeded, false otherwise
 */
export function rateLimit(req: VercelRequest, res: VercelResponse, config: RateLimitConfig): boolean {
  // DISABLED: In-memory rate limiting doesn't work in serverless
  // Rely on Vercel's built-in protection instead

  // Optionally log for monitoring
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Rate Limit Check] ${req.method} ${req.url} - Would check: ${config.max} req/${config.windowMs}ms`);
  }

  return false; // Never rate limit (rely on Vercel's infrastructure)
}

/**
 * Preset rate limit configs (for reference/documentation)
 * Note: These are not enforced in serverless without external storage
 */
export const RateLimits = {
  // Strict limits for auth endpoints (signup, login)
  AUTH: {
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Moderate limits for write operations
  WRITE: {
    max: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  // Generous limits for read operations
  READ: {
    max: 100,
    windowMs: 60 * 1000, // 1 minute
  },
};
