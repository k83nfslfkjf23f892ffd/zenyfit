import { z } from 'zod';

// ============================================================================
// Authentication Schemas
// ============================================================================

export const signUpSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(12, 'Username must be at most 12 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(7, 'Password must be at least 7 characters'),
  inviteCode: z
    .string()
    .min(1, 'Invite code is required'),
});

export const signInSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(12, 'Username must be at most 12 characters'),
  password: z
    .string()
    .min(7, 'Password must be at least 7 characters'),
});

// ============================================================================
// User Schemas
// ============================================================================

// All exercise types (used in schemas)
export const EXERCISE_TYPES = [
  // Calisthenics
  'pushups', 'knee_pushups', 'incline_pushups', 'decline_pushups', 'diamond_pushups',
  'archer_pushups', 'onearm_pushups', 'pullups', 'assisted_pullups', 'chinups',
  'wide_pullups', 'lsit_pullups', 'australian_pullups', 'dips', 'bench_dips',
  'ring_dips', 'muscleups',
  // Cardio
  'running', 'walking', 'swimming', 'sprinting',
  // Team Sports
  'volleyball', 'basketball', 'soccer',
  // Custom
  'custom',
] as const;

export const exerciseTypeSchema = z.enum(EXERCISE_TYPES);

// Dashboard widget configuration schema
export const dashboardWidgetsSchema = z.object({
  order: z.array(z.string().max(50)).max(20).default([]),
  hidden: z.array(z.string().max(50)).max(20).default([]),
});

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  avatar: z.string().optional(),
  level: z.number().int().min(1).default(1),
  xp: z.number().int().min(0).default(0),
  totals: z.record(z.string(), z.number().min(0)).default({}),
  isAdmin: z.boolean().default(false),
  isBanned: z.boolean().default(false),
  invitedBy: z.string().optional(),
  createdAt: z.number(), // timestamp
  theme: z.string().optional(),
  quickAddPresets: z.record(z.string(), z.array(z.number().positive()).max(8)).optional(),
  dashboardWidgets: dashboardWidgetsSchema.optional(),
});

// ============================================================================
// Exercise Log Schemas
// ============================================================================

export const exerciseLogSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  type: exerciseTypeSchema,
  customExerciseId: z.string().optional(), // required when type is 'custom'
  customExerciseName: z.string().optional(), // denormalized for display
  amount: z.number().positive('Amount must be positive'),
  timestamp: z.number(), // timestamp
  xpEarned: z.number().int().min(0).default(0),
  synced: z.boolean().default(true),
  isCustom: z.boolean().default(false),
});

export const customExerciseLogSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  customExerciseId: z.string(),
  amount: z.number().positive('Amount must be positive'),
  timestamp: z.number(), // timestamp
  synced: z.boolean().default(true),
});

// ============================================================================
// Custom Exercise Schemas
// ============================================================================

export const customExerciseSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string().min(1).max(50),
  unit: z.string().min(1).max(20),
  quickActions: z.array(z.number().positive()).max(6).default([]),
  createdAt: z.number(), // timestamp
});

// ============================================================================
// Challenge Schemas
// ============================================================================

export const participantSchema = z.object({
  userId: z.string(),
  username: z.string(),
  avatar: z.string().optional(),
  progress: z.number().min(0).default(0),
});

export const challengeSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: exerciseTypeSchema,
  customExerciseId: z.string().optional(), // only if type is 'custom'
  goal: z.number().positive(),
  startDate: z.number(), // timestamp
  endDate: z.number(), // timestamp
  participants: z.array(participantSchema).default([]),
  participantIds: z.array(z.string()).default([]), // for efficient queries
  isPublic: z.boolean().default(false),
  createdBy: z.string(),
  createdAt: z.number(), // timestamp
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
  }).optional(),
});

export const challengeInviteSchema = z.object({
  id: z.string().optional(),
  challengeId: z.string(),
  challengeTitle: z.string(),
  invitedUserId: z.string(),
  invitedBy: z.string(),
  invitedByUsername: z.string(),
  status: z.enum(['pending', 'accepted', 'declined']).default('pending'),
  timestamp: z.number(), // timestamp
});

// ============================================================================
// Invite Code Schemas
// ============================================================================

export const inviteCodeSchema = z.object({
  code: z.string(), // also the document ID
  createdBy: z.string(),
  used: z.boolean().default(false),
  usedBy: z.string().optional(),
  createdAt: z.number(), // timestamp
  usedAt: z.number().optional(), // timestamp
});

// ============================================================================
// Type exports
// ============================================================================

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type User = z.infer<typeof userSchema>;
export type DashboardWidgets = z.infer<typeof dashboardWidgetsSchema>;
export type ExerciseType = z.infer<typeof exerciseTypeSchema>;
export type ExerciseLog = z.infer<typeof exerciseLogSchema>;
export type CustomExerciseLog = z.infer<typeof customExerciseLogSchema>;
export type CustomExercise = z.infer<typeof customExerciseSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type ChallengeInvite = z.infer<typeof challengeInviteSchema>;
export type InviteCode = z.infer<typeof inviteCodeSchema>;
