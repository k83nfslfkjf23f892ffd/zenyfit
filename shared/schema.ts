import { z } from "zod";

// User schema - for Firestore
export const userSchema = z.object({
  id: z.string().optional(), // Firestore doc ID
  username: z.string().min(3).max(20),
  email: z.string().email().optional(),
  avatar: z.string().optional(),
  level: z.number().default(1),
  xp: z.number().default(0),
  totalPullups: z.number().default(0),
  totalPushups: z.number().default(0),
  totalDips: z.number().default(0),
  totalRunningKm: z.number().default(0),
  invitedBy: z.string().optional().nullable(),
  createdAt: z.number().optional(),
});

export const insertUserSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6).max(100),
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Exercise log schema
export const exerciseLogSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  type: z.enum(["pull-up", "push-up", "dip", "run"]).or(z.string()),
  amount: z.number().positive(),
  timestamp: z.number(), // Unix timestamp
  synced: z.boolean().default(true),
  isCustom: z.boolean().optional(),
});

export type ExerciseLog = z.infer<typeof exerciseLogSchema>;

// Challenge schema
export const challengeSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  type: z.enum(["pull-up", "push-up", "dip", "run"]).or(z.string()),
  goal: z.number().positive(),
  startDate: z.number(),
  endDate: z.number(),
  participants: z.array(
    z.object({
      userId: z.string(),
      progress: z.number(),
      avatar: z.string(),
      username: z.string(),
    })
  ).default([]),
  isPublic: z.boolean(),
  colors: z.object({
    from: z.string(),
    to: z.string(),
  }),
  createdBy: z.string(),
});

export type Challenge = z.infer<typeof challengeSchema>;

// Invite code schema
export const inviteCodeSchema = z.object({
  code: z.string(),
  createdBy: z.string(),
  used: z.boolean().default(false),
  usedBy: z.string().nullable().default(null),
  createdAt: z.number(),
  usedAt: z.number().optional(),
});

export type InviteCode = z.infer<typeof inviteCodeSchema>;

// Auth schema
export const signUpSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
