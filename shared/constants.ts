// Shared constants for ZenyFit
// Used by both client and server to ensure consistency

export const XP_RATES = {
  "pull-up": 15,
  "push-up": 3,
  "dip": 10,
  "run": 50, // per km
  custom: 5, // default for custom exercises
} as const;

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

export const EXERCISE_TYPES = {
  PULL_UP: "pull-up",
  PUSH_UP: "push-up",
  DIP: "dip",
  RUN: "run",
} as const;

export type ExerciseType = typeof EXERCISE_TYPES[keyof typeof EXERCISE_TYPES] | string;

/**
 * Calculate level based on total XP
 */
export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      if (i >= LEVEL_THRESHOLDS.length - 1) {
        const extraXP = xp - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
        return LEVEL_THRESHOLDS.length + Math.floor(extraXP / XP_PER_LEVEL_AFTER_10);
      }
      return i + 1;
    }
  }
  return 1;
}

/**
 * Get XP required for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] +
           ((currentLevel - LEVEL_THRESHOLDS.length + 1) * XP_PER_LEVEL_AFTER_10);
  }
  return LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

/**
 * Calculate XP for a workout
 */
export function calculateWorkoutXP(exerciseType: string, amount: number): number {
  const rate = XP_RATES[exerciseType as keyof typeof XP_RATES] || XP_RATES.custom;
  return Math.floor(amount * rate);
}
