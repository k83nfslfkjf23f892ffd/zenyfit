// Achievement definitions and logic

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'workout' | 'progress' | 'challenge' | 'social';
  condition: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalWorkouts: number;
  totalXP: number;
  level: number;
  totals: {
    pullups: number;
    pushups: number;
    dips: number;
    running: number;
  };
  challengesCompleted: number;
  challengesCreated: number;
  usersInvited: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Workout Milestones
  {
    id: 'first_workout',
    title: 'Getting Started',
    description: 'Log your first workout',
    icon: '🏁',
    category: 'workout',
    condition: (stats) => stats.totalWorkouts >= 1,
  },
  {
    id: 'workout_10',
    title: 'Dedicated',
    description: 'Log 10 workouts',
    icon: '💪',
    category: 'workout',
    condition: (stats) => stats.totalWorkouts >= 10,
  },
  {
    id: 'workout_50',
    title: 'Committed',
    description: 'Log 50 workouts',
    icon: '🔥',
    category: 'workout',
    condition: (stats) => stats.totalWorkouts >= 50,
  },
  {
    id: 'workout_100',
    title: 'Unstoppable',
    description: 'Log 100 workouts',
    icon: '⚡',
    category: 'workout',
    condition: (stats) => stats.totalWorkouts >= 100,
  },

  // Progress Milestones
  {
    id: 'level_5',
    title: 'Rising Star',
    description: 'Reach Level 5',
    icon: '⭐',
    category: 'progress',
    condition: (stats) => stats.level >= 5,
  },
  {
    id: 'level_10',
    title: 'Elite Athlete',
    description: 'Reach Level 10',
    icon: '🏆',
    category: 'progress',
    condition: (stats) => stats.level >= 10,
  },
  {
    id: 'level_20',
    title: 'Legendary',
    description: 'Reach Level 20',
    icon: '👑',
    category: 'progress',
    condition: (stats) => stats.level >= 20,
  },
  {
    id: 'xp_10000',
    title: 'XP Master',
    description: 'Earn 10,000 total XP',
    icon: '💎',
    category: 'progress',
    condition: (stats) => stats.totalXP >= 10000,
  },

  // Exercise-Specific
  {
    id: 'pullups_100',
    title: 'Pull-up Pro',
    description: 'Complete 100 total pull-ups',
    icon: '🦾',
    category: 'workout',
    condition: (stats) => stats.totals.pullups >= 100,
  },
  {
    id: 'pushups_1000',
    title: 'Push-up Champion',
    description: 'Complete 1,000 total push-ups',
    icon: '💥',
    category: 'workout',
    condition: (stats) => stats.totals.pushups >= 1000,
  },
  {
    id: 'dips_100',
    title: 'Dip Master',
    description: 'Complete 100 total dips',
    icon: '🔱',
    category: 'workout',
    condition: (stats) => stats.totals.dips >= 100,
  },
  {
    id: 'running_50',
    title: 'Marathon Runner',
    description: 'Run 50 total kilometers',
    icon: '🏃',
    category: 'workout',
    condition: (stats) => stats.totals.running >= 50,
  },

  // Challenge Milestones
  {
    id: 'challenge_complete_1',
    title: 'Challenge Accepted',
    description: 'Complete your first challenge',
    icon: '🎯',
    category: 'challenge',
    condition: (stats) => stats.challengesCompleted >= 1,
  },
  {
    id: 'challenge_complete_5',
    title: 'Challenge Seeker',
    description: 'Complete 5 challenges',
    icon: '🎪',
    category: 'challenge',
    condition: (stats) => stats.challengesCompleted >= 5,
  },
  {
    id: 'challenge_create_1',
    title: 'Challenge Creator',
    description: 'Create your first challenge',
    icon: '🎨',
    category: 'challenge',
    condition: (stats) => stats.challengesCreated >= 1,
  },

  // Social Milestones
  {
    id: 'invite_1',
    title: 'Recruiter',
    description: 'Invite 1 user to ZenyFit',
    icon: '🤝',
    category: 'social',
    condition: (stats) => stats.usersInvited >= 1,
  },
  {
    id: 'invite_5',
    title: 'Community Builder',
    description: 'Invite 5 users to ZenyFit',
    icon: '🌟',
    category: 'social',
    condition: (stats) => stats.usersInvited >= 5,
  },
];

/**
 * Check which achievements a user has unlocked
 */
export function checkAchievements(stats: AchievementStats): string[] {
  return ACHIEVEMENTS
    .filter((achievement) => achievement.condition(stats))
    .map((achievement) => achievement.id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: Achievement['category']): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
