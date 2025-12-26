import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

/**
 * Distributed rate limiter using Vercel KV (Redis)
 * Falls back to in-memory storage for development when KV is not configured
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Fallback in-memory store for development
const rateLimitStore = new Map<string, RateLimitEntry>();
let useKV = true;

// Clean up old entries from in-memory store every 5 minutes
setInterval(() => {
  if (useKV) return; // Skip if using KV
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
 * Rate limiting middleware using Vercel KV
 * Returns true if rate limit exceeded, false otherwise
 */
export async function rateLimit(req: VercelRequest, res: VercelResponse, config: RateLimitConfig): Promise<boolean> {
  const { max, windowMs, keyGenerator } = config;

  // Generate key (default: IP address)
  const identifier = keyGenerator
    ? keyGenerator(req)
    : req.headers['x-forwarded-for']?.toString() || req.headers['x-real-ip']?.toString() || 'unknown';

  const key = `ratelimit:${identifier}`;
  const now = Date.now();

  try {
    // Try to use Vercel KV
    const data = await kv.get<RateLimitEntry>(key);

    if (!data || data.resetAt < now) {
      // First request or window expired
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      await kv.set(key, newEntry, { px: windowMs });
      setRateLimitHeaders(res, max, max - 1, Math.floor((now + windowMs) / 1000));
      return false;
    }

    if (data.count >= max) {
      // Rate limit exceeded
      setRateLimitHeaders(res, max, 0, Math.floor(data.resetAt / 1000));
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((data.resetAt - now) / 1000),
      });
      return true;
    }

    // Increment count
    const updatedEntry: RateLimitEntry = {
      count: data.count + 1,
      resetAt: data.resetAt,
    };
    await kv.set(key, updatedEntry, { px: data.resetAt - now });
    setRateLimitHeaders(res, max, max - updatedEntry.count, Math.floor(data.resetAt / 1000));
    return false;
  } catch (error) {
    // Fall back to in-memory rate limiting if KV is not available
    console.warn('Vercel KV not available, falling back to in-memory rate limiting:', error);
    useKV = false;
    return rateLimitInMemory(identifier, res, config, now);
  }
}

/**
 * Fallback in-memory rate limiter for development
 */
function rateLimitInMemory(
  identifier: string,
  res: VercelResponse,
  config: RateLimitConfig,
  now: number
): boolean {
  const { max, windowMs } = config;
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    rateLimitStore.set(identifier, {
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
