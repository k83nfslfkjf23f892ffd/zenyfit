/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitize a string by removing HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize username (alphanumeric + underscore only)
 */
export function sanitizeUsername(username: string): string {
  if (typeof username !== 'string') return '';

  return username
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 12); // Max length enforced
}

/**
 * Sanitize text with length limit (for titles, descriptions)
 */
export function sanitizeText(text: string, maxLength: number): string {
  if (typeof text !== 'string') return '';

  return sanitizeString(text).slice(0, maxLength);
}

/**
 * Sanitize challenge title
 */
export function sanitizeChallengeTitle(title: string): string {
  return sanitizeText(title, 100);
}

/**
 * Sanitize challenge description
 */
export function sanitizeChallengeDescription(description: string): string {
  return sanitizeText(description, 500);
}

/**
 * Sanitize custom exercise name
 */
export function sanitizeExerciseName(name: string): string {
  return sanitizeText(name, 50);
}

/**
 * Sanitize exercise unit
 */
export function sanitizeExerciseUnit(unit: string): string {
  return sanitizeText(unit, 20);
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';

  return email
    .trim()
    .toLowerCase()
    .slice(0, 255); // Max email length
}

/**
 * Validate number input
 */
export function validateNumber(value: unknown, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));

  if (isNaN(num)) return min;
  if (num < min) return min;
  if (num > max) return max;

  return num;
}

/**
 * Validate integer input
 */
export function validateInteger(value: unknown, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
  const num = validateNumber(value, min, max);
  return Math.floor(num);
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, use Redis or similar
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clear old rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
