import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation of rate limiting logic for testing
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private windowMs: number,
    private maxRequests: number
  ) {}

  check(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    const existingRequests = this.requests.get(identifier) || [];

    // Filter out requests outside the time window
    const recentRequests = existingRequests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return true; // Request allowed
  }

  reset(identifier: string) {
    this.requests.delete(identifier);
  }
}

describe('Rate Limiting', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    // Create a rate limiter: 5 requests per 60 seconds
    limiter = new RateLimiter(60000, 5);
  });

  describe('RateLimiter', () => {
    it('should allow requests under the limit', () => {
      const ip = '192.168.1.1';

      expect(limiter.check(ip)).toBe(true);
      expect(limiter.check(ip)).toBe(true);
      expect(limiter.check(ip)).toBe(true);
      expect(limiter.check(ip)).toBe(true);
      expect(limiter.check(ip)).toBe(true);
    });

    it('should block requests over the limit', () => {
      const ip = '192.168.1.1';

      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        expect(limiter.check(ip)).toBe(true);
      }

      // 6th request should be blocked
      expect(limiter.check(ip)).toBe(false);
      expect(limiter.check(ip)).toBe(false);
    });

    it('should track different IPs separately', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      // Make 5 requests from ip1
      for (let i = 0; i < 5; i++) {
        expect(limiter.check(ip1)).toBe(true);
      }

      // ip1 should be blocked
      expect(limiter.check(ip1)).toBe(false);

      // But ip2 should still work
      expect(limiter.check(ip2)).toBe(true);
    });

    it('should reset rate limit for an identifier', () => {
      const ip = '192.168.1.1';

      // Exceed limit
      for (let i = 0; i < 5; i++) {
        limiter.check(ip);
      }
      expect(limiter.check(ip)).toBe(false);

      // Reset
      limiter.reset(ip);

      // Should work again
      expect(limiter.check(ip)).toBe(true);
    });
  });

  describe('Rate Limit Configurations', () => {
    it('should enforce strict limits', () => {
      const strictLimiter = new RateLimiter(60000, 1);
      const ip = '192.168.1.1';

      expect(strictLimiter.check(ip)).toBe(true);
      expect(strictLimiter.check(ip)).toBe(false);
    });

    it('should allow higher limits', () => {
      const generousLimiter = new RateLimiter(60000, 100);
      const ip = '192.168.1.1';

      // Should allow 100 requests
      for (let i = 0; i < 100; i++) {
        expect(generousLimiter.check(ip)).toBe(true);
      }

      // 101st should fail
      expect(generousLimiter.check(ip)).toBe(false);
    });
  });
});
