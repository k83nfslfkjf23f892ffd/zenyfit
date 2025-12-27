import { z } from "zod";

// User schema - for Firestore
export const userSchema = z.object({
  id: z.string().optional(), // Firestore doc ID
  username: z.string().min(3).max(20),
  password: z.string().min(7).max(100),
  avatar: z.string().optional(),
  level: z.number().default(1),
  xp: z.number().default(0),
  createdAt: z.number().optional(),
});

export const insertUserSchema = userSchema.pick({
  username: true,
  password: true,
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

// Auth schema
export const signUpSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(7),
  confirmPassword: z.string().min(7),
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

// Achievement schema
export const achievementSchema = z.object({
  achievementId: z.string(),
  unlockedAt: z.number(), // Timestamp when unlocked
});

export type Achievement = z.infer<typeof achievementSchema>;
