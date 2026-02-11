// ============================================================================
// App Version
// ============================================================================

export const APP_VERSION = '2.4.0';
export const APP_URL = 'https://zenyfit.vercel.app';

// ============================================================================
// Changelog — newest first, max ~5 entries shown
// ============================================================================

export const CHANGELOG = [
  {
    version: '2.4.0',
    title: 'Workout Streaks & Security',
    items: [
      'New Workout Streak widget — track your current and longest streaks',
      'Streaks auto-update when you log or delete workouts',
      'Added Content Security Policy header for better protection',
    ],
  },
  {
    version: '2.3.4',
    title: 'Activity Heatmap',
    items: [
      'Consistency widget replaced with monthly activity heatmap',
      'Color-coded day cells show workout intensity at a glance',
    ],
  },
  {
    version: '2.3.3',
    title: 'Offline Workout Logging',
    items: [
      'Log workouts without internet — they sync automatically when you reconnect',
      'Offline banner shows connection status',
    ],
  },
  {
    version: '2.3.2',
    title: 'Session Fixes & Nav Polish',
    items: [
      'Fixed session total when deleting workouts',
      'Instant active state on bottom nav tabs',
    ],
  },
  {
    version: '2.3.0',
    title: 'Dashboard Customization',
    items: [
      'Drag-and-drop to reorder dashboard widgets',
      'Edit button to enter/exit reorder mode',
    ],
  },
] as const;

// ============================================================================
// XP System Constants
// ============================================================================

// Exercise Categories
export const EXERCISE_CATEGORIES = {
  calisthenics: {
    label: 'Calisthenics',
    unit: 'reps',
    exercises: ['pushups', 'pullups', 'dips', 'muscleups', 'australian_pullups',
                'knee_pushups', 'incline_pushups', 'decline_pushups', 'diamond_pushups',
                'archer_pushups', 'onearm_pushups', 'assisted_pullups', 'chinups',
                'wide_pullups', 'lsit_pullups', 'bench_dips', 'ring_dips',
                'passive_dead_hang', 'active_dead_hang', 'flexed_arm_hang'],
  },
  cardio: {
    label: 'Cardio',
    unit: 'km',
    exercises: ['running', 'walking', 'swimming', 'sprinting'],
  },
  team_sports: {
    label: 'Team Sports',
    unit: 'min',
    exercises: ['volleyball', 'basketball', 'soccer'],
  },
} as const;

// XP Rates based on biomechanical difficulty (from competing.md)
export const XP_RATES: Record<string, number> = {
  // === CALISTHENICS (per rep) ===
  // Push-up variations
  pushups: 3,           // Baseline: 64% body weight
  knee_pushups: 2,      // ~49% body weight
  incline_pushups: 2,   // ~40-55% body weight
  decline_pushups: 4,   // ~75% body weight
  diamond_pushups: 4,   // Increased tricep demand
  archer_pushups: 5,    // Asymmetric loading
  onearm_pushups: 6,    // Near full body weight on one arm

  // Pull-up variations
  pullups: 6,           // 100% body weight
  assisted_pullups: 3,  // Reduced load (~50-70%)
  chinups: 5,           // Slightly easier (bicep advantage)
  wide_pullups: 7,      // Reduced mechanical advantage
  lsit_pullups: 8,      // Added core demand
  australian_pullups: 2,// 40-60% body weight, similar to push-ups

  // Dip variations
  dips: 6,              // 95% body weight, full ROM
  bench_dips: 2,        // Feet on ground, much easier (~40-50%)
  ring_dips: 7,         // Added instability

  // Bar Hangs (per second)
  passive_dead_hang: 0.5, // Grip endurance only, minimal muscular demand
  active_dead_hang: 2,  // Scapular engagement, moderate difficulty
  flexed_arm_hang: 3,   // Sustained bicep/lat/upper back contraction, highest difficulty

  // Advanced
  muscleups: 11,        // Pull-up + transition + partial dip

  // === CARDIO (per km) ===
  running: 30,          // 8-9 MET, 70 kcal/km
  walking: 18,          // ~0.5x running MET, 55 kcal/km
  swimming: 40,         // Higher resistance than running
  sprinting: 50,        // Very high intensity (per km equivalent)

  // === TEAM SPORTS (per minute) ===
  volleyball: 2,        // 8.0 MET, intermittent with rest
  basketball: 2,        // Similar MET to volleyball
  soccer: 2,            // More continuous than volleyball

  // Custom exercises
  custom: 0,            // Tracking only
} as const;

// Exercise display info
export const EXERCISE_INFO: Record<string, { label: string; category: string; unit: string }> = {
  // Push-up variations
  pushups: { label: 'Push-ups', category: 'calisthenics', unit: 'reps' },
  knee_pushups: { label: 'Knee Push-ups', category: 'calisthenics', unit: 'reps' },
  incline_pushups: { label: 'Incline Push-ups', category: 'calisthenics', unit: 'reps' },
  decline_pushups: { label: 'Decline Push-ups', category: 'calisthenics', unit: 'reps' },
  diamond_pushups: { label: 'Diamond Push-ups', category: 'calisthenics', unit: 'reps' },
  archer_pushups: { label: 'Archer Push-ups', category: 'calisthenics', unit: 'reps' },
  onearm_pushups: { label: 'One-arm Push-ups', category: 'calisthenics', unit: 'reps' },

  // Pull-up variations
  pullups: { label: 'Pull-ups', category: 'calisthenics', unit: 'reps' },
  assisted_pullups: { label: 'Assisted Pull-ups', category: 'calisthenics', unit: 'reps' },
  chinups: { label: 'Chin-ups', category: 'calisthenics', unit: 'reps' },
  wide_pullups: { label: 'Wide Grip Pull-ups', category: 'calisthenics', unit: 'reps' },
  lsit_pullups: { label: 'L-sit Pull-ups', category: 'calisthenics', unit: 'reps' },
  australian_pullups: { label: 'Australian Pull-ups', category: 'calisthenics', unit: 'reps' },

  // Bar Hangs
  passive_dead_hang: { label: 'Passive Dead Hang', category: 'calisthenics', unit: 'sec' },
  active_dead_hang: { label: 'Active Dead Hang', category: 'calisthenics', unit: 'sec' },
  flexed_arm_hang: { label: 'Flexed-arm Hang', category: 'calisthenics', unit: 'sec' },

  // Dip variations
  dips: { label: 'Dips', category: 'calisthenics', unit: 'reps' },
  bench_dips: { label: 'Bench Dips', category: 'calisthenics', unit: 'reps' },
  ring_dips: { label: 'Ring Dips', category: 'calisthenics', unit: 'reps' },

  // Advanced
  muscleups: { label: 'Muscle-ups', category: 'calisthenics', unit: 'reps' },

  // Cardio
  running: { label: 'Running', category: 'cardio', unit: 'km' },
  walking: { label: 'Walking', category: 'cardio', unit: 'km' },
  swimming: { label: 'Swimming', category: 'cardio', unit: 'km' },
  sprinting: { label: 'Sprinting', category: 'cardio', unit: 'km' },

  // Team Sports
  volleyball: { label: 'Volleyball', category: 'team_sports', unit: 'min' },
  basketball: { label: 'Basketball', category: 'team_sports', unit: 'min' },
  soccer: { label: 'Soccer', category: 'team_sports', unit: 'min' },
};

// Calisthenics preset layout (3 rows)
export const CALISTHENICS_PRESETS = {
  row1: [1, 3, 5, 7],       // 4 items
  row2: [10, 15, 20, 25],   // 4 items
  row3: [30, 50, 70, 100],  // 4 items
} as const;

// Bar Hang preset layout (3 rows, seconds)
export const HANG_PRESETS = {
  row1: [5, 10, 15, 20],       // short holds
  row2: [30, 45, 60, 90],      // medium holds
  row3: [120, 150, 180, 240],  // long holds
} as const;

// Base calisthenics exercise types with their variations
export const CALISTHENICS_BASE_TYPES = {
  pushups: {
    label: 'Push-ups',
    variations: ['pushups', 'knee_pushups', 'incline_pushups', 'decline_pushups', 'diamond_pushups', 'archer_pushups', 'onearm_pushups'],
  },
  pullups: {
    label: 'Pull-ups',
    variations: ['pullups', 'assisted_pullups', 'chinups', 'wide_pullups', 'lsit_pullups', 'australian_pullups'],
  },
  dips: {
    label: 'Dips',
    variations: ['dips', 'bench_dips', 'ring_dips'],
  },
  muscleups: {
    label: 'Muscle-ups',
    variations: ['muscleups'],
  },
  hangs: {
    label: 'Hangs',
    variations: ['passive_dead_hang', 'active_dead_hang', 'flexed_arm_hang'],
  },
} as const;

export const DEFAULT_QUICK_ADD_PRESETS: Record<string, number[]> = {
  // Calisthenics - all use same presets now (will be displayed in 3-row layout)
  pushups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  knee_pushups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  incline_pushups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  decline_pushups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  diamond_pushups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  archer_pushups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  onearm_pushups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  pullups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  assisted_pullups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  chinups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  wide_pullups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  lsit_pullups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  australian_pullups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  dips: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  bench_dips: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  ring_dips: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  muscleups: [1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100],
  // Bar Hangs (seconds)
  passive_dead_hang: [5, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180],
  active_dead_hang: [5, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180],
  flexed_arm_hang: [5, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180],
  // Cardio (km)
  running: [1, 3, 5, 10, 15],
  walking: [1, 2, 3, 5, 10],
  swimming: [0.5, 1, 2, 3, 5],
  sprinting: [0.1, 0.2, 0.4, 0.5, 1],
  // Team Sports (minutes)
  volleyball: [30, 45, 60, 90, 120],
  basketball: [30, 45, 60, 90, 120],
  soccer: [30, 45, 60, 90, 120],
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
// Display Helpers
// ============================================================================

/**
 * Format seconds as minutes for display in totals/stats
 */
export function formatSecondsAsMinutes(seconds: number): string {
  const minutes = seconds / 60;
  if (minutes === Math.floor(minutes)) {
    return `${minutes} min`;
  }
  return `${parseFloat(minutes.toFixed(1))} min`;
}

// ============================================================================
// Limits
// ============================================================================

export const LIMITS = {
  customExercises: 12,
  inviteCodes: 25,
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
