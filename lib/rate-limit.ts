import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Simple in-memory rate limiter
 * Suitable for small-scale deployments and development
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

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
 * Rate limiting middleware
 * Returns true if rate limit exceeded, false otherwise
 */
export function rateLimit(req: VercelRequest, res: VercelResponse, config: RateLimitConfig): boolean {
  const { max, windowMs, keyGenerator } = config;

  // Generate key (default: IP address)
  const key = keyGenerator
    ? keyGenerator(req)
    : req.headers['x-forwarded-for']?.toString() || req.headers['x-real-ip']?.toString() || 'unknown';

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    setRateLimitHeaders(res, max, max - 1, Math.floor((now + windowMs) / 1000));
    return false;
  }

  if (entry.count >= max) {
    // Rate limit exceeded
    setRateLimitHeaders(res, max, 0, Math.floor(entry.resetAt / 1000));
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return true;
  }

  // Increment count
  entry.count++;
  setRateLimitHeaders(res, max, max - entry.count, Math.floor(entry.resetAt / 1000));
  return false;
}

function setRateLimitHeaders(res: VercelResponse, limit: number, remaining: number, reset: number) {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', reset.toString());
}

/**
 * Preset rate limit configs
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
