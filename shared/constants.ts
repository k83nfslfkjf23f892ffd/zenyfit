// ============================================================================
// App Version
// ============================================================================

export const APP_VERSION = '2.1.0';

// ============================================================================
// XP System Constants
// ============================================================================

export const XP_RATES = {
  pullups: 15,
  pushups: 3,
  dips: 12,
  running: 30, // per km
  custom: 0, // custom exercises earn 0 XP (tracking only)
} as const;

// Level thresholds for levels 1-10
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  500,    // Level 2
  1500,   // Level 3
  3000,   // Level 4
  5000,   // Level 5
  8000,   // Level 6
  12000,  // Level 7
  17000,  // Level 8
  23000,  // Level 9
  30000,  // Level 10
] as const;

// XP required per level after level 10
export const XP_PER_LEVEL_AFTER_10 = 7000;

/**
 * Calculate level from total XP
 */
export function calculateLevel(xp: number): number {
  // Check levels 1-10 using thresholds
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }

  // If XP exceeds level 10 threshold, calculate additional levels
  const xpAfterLevel10 = xp - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const additionalLevels = Math.floor(xpAfterLevel10 / XP_PER_LEVEL_AFTER_10);
  return 10 + additionalLevels;
}

/**
 * Get XP required for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[currentLevel];
  }

  // For levels beyond 10
  const levelsAfter10 = currentLevel - 10;
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (levelsAfter10 * XP_PER_LEVEL_AFTER_10);
}

/**
 * Calculate XP for current level (how much XP into the current level)
 */
export function getXPInCurrentLevel(totalXp: number, currentLevel: number): number {
  if (currentLevel <= 1) return totalXp;

  if (currentLevel <= LEVEL_THRESHOLDS.length) {
    return totalXp - LEVEL_THRESHOLDS[currentLevel - 1];
  }

  // For levels beyond 10
  const previousLevelThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] +
    ((currentLevel - 11) * XP_PER_LEVEL_AFTER_10);
  return totalXp - previousLevelThreshold;
}

/**
 * Get XP needed for next level (relative to current level)
 */
export function getXPNeededForNextLevel(currentLevel: number): number {
  if (currentLevel < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[currentLevel] - LEVEL_THRESHOLDS[currentLevel - 1];
  }

  return XP_PER_LEVEL_AFTER_10;
}

// ============================================================================
// Limits
// ============================================================================

export const LIMITS = {
  customExercises: 12,
  inviteCodes: 5,
  usernameMinLength: 3,
  usernameMaxLength: 12,
  passwordMinLength: 7,
  challengeTitleMaxLength: 100,
  challengeDescriptionMaxLength: 500,
} as const;

// ============================================================================
// Email Domain
// ============================================================================

export const EMAIL_DOMAIN = '@zenyfit.local';

/**
 * Convert username to email format
 */
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}${EMAIL_DOMAIN}`;
}

/**
 * Extract username from email
 */
export function emailToUsername(email: string): string {
  return email.replace(EMAIL_DOMAIN, '');
}
