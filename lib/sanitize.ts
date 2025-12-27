/**
 * Sanitization utilities for user input
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize a string by removing/escaping dangerous characters
 * - Strips HTML tags
 * - Trims whitespace
 * - Limits length
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Normalize whitespace
    .trim()
    // Limit length
    .slice(0, maxLength);
}

/**
 * Sanitize challenge title
 * - Max 100 characters
 * - No HTML
 * - Required (throws if empty after sanitization)
 */
export function sanitizeChallengeTitle(title: string): string {
  const sanitized = sanitizeString(title, 100);

  if (!sanitized || sanitized.length < 1) {
    throw new Error('Title is required and must not be empty');
  }

  return sanitized;
}

/**
 * Sanitize challenge description (optional field)
 * - Max 500 characters
 * - No HTML
 */
export function sanitizeChallengeDescription(description: string): string {
  return sanitizeString(description, 500);
}

/**
 * Sanitize username
 * - Max 30 characters
 * - Alphanumeric, spaces, underscores, hyphens only
 */
export function sanitizeUsername(username: string): string {
  if (typeof username !== 'string') {
    return '';
  }

  return username
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Only allow safe characters: alphanumeric, spaces, underscores, hyphens
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .slice(0, 30);
}
