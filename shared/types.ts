/**
 * Shared TypeScript types for ZenyFit
 *
 * These types represent the shape of data as returned from API endpoints,
 * which may differ from the Zod schemas in schema.ts (which are used for validation).
 */

/**
 * Exercise log as returned from /api/workouts
 */
export interface ExerciseLog {
  id: string;
  exerciseType: string;
  amount: number;
  unit: string;
  xpGained: number;
  timestamp: number;
  isCustom?: boolean;
  createdAt?: string;
}

/**
 * Challenge as returned from /api/challenges
 */
export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  goal: number;
  startDate: number;
  endDate: number;
  participants: Array<{
    userId: string;
    username: string;
    avatar: string;
    progress: number;
    joinedAt?: number;
  }>;
  participantIds: string[];
  isPublic: boolean;
  colors?: {
    from: string;
    to: string;
  };
  createdBy: string;
  createdAt?: number;
}

/**
 * User profile as returned from /api/users
 */
export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp?: number;
  totalPullups?: number;
  totalPushups?: number;
  totalDips?: number;
  totalRunningKm?: number;
  followerCount?: number;
  followingCount?: number;
  createdAt?: number;
}

/**
 * Achievement as returned from /api/achievements
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  total: number;
}

/**
 * Challenge invite as returned from /api/invites
 */
export interface ChallengeInvite {
  id: string;
  challengeId: string;
  challengeTitle: string;
  challengeType: string;
  invitedUserId: string;
  invitedBy: string;
  invitedByUsername: string;
  invitedByAvatar: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
}

/**
 * Activity feed item as returned from /api/social?action=feed
 */
export interface FeedActivity {
  id: string;
  type: "workout";
  userId: string;
  username: string;
  avatar: string;
  exerciseType: string;
  amount: number;
  unit: string;
  timestamp: number;
  xpGained: number;
}
