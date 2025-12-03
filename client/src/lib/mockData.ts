import { addDays, subDays } from "date-fns";

export type User = {
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  inviteCodes: { code: string; used: boolean }[];
};

export type ExerciseType = "pull-up" | "push-up" | "dip" | "run";

export type ExerciseLog = {
  id: string;
  userId: string;
  type: ExerciseType | string;
  amount: number; // reps or km
  timestamp: Date;
  synced: boolean;
  isCustom?: boolean;
};

export type Challenge = {
  id: string;
  title: string;
  description: string;
  type: ExerciseType;
  goal: number;
  startDate: Date;
  endDate: Date;
  participants: { userId: string; progress: number; avatar: string; username: string }[];
  isPublic: boolean;
  colors: { from: string; to: string };
};

export type ChallengeInvite = {
  id: string;
  challengeId: string;
  challengeTitle: string;
  challengeType: ExerciseType;
  invitedBy: string;
  invitedByUsername: string;
  invitedByAvatar: string;
  createdAt: Date;
};

export const currentUser: User = {
  id: "u1",
  username: "ZenMaster",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ZenMaster",
  level: 5,
  xp: 2450,
  inviteCodes: [
    { code: "ZEN-8821", used: true },
    { code: "FIT-9922", used: false },
    { code: "PWR-1123", used: false },
  ],
};

export const exercises: ExerciseLog[] = [
  { id: "e1", userId: "u1", type: "push-up", amount: 25, timestamp: subDays(new Date(), 0), synced: true },
  { id: "e2", userId: "u1", type: "pull-up", amount: 10, timestamp: subDays(new Date(), 0), synced: false },
  { id: "e3", userId: "u1", type: "run", amount: 5.2, timestamp: subDays(new Date(), 1), synced: true },
  { id: "e4", userId: "u1", type: "dip", amount: 15, timestamp: subDays(new Date(), 2), synced: true },
];

export const customExercises: ExerciseLog[] = [];

export const allUsers: User[] = [
  currentUser,
  { id: "u2", username: "IronLady", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=IronLady", level: 8, xp: 5200, inviteCodes: [] },
  { id: "u3", username: "FitBro", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=FitBro", level: 6, xp: 3100, inviteCodes: [] },
  { id: "u4", username: "Speedy", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Speedy", level: 7, xp: 4500, inviteCodes: [] },
  { id: "u5", username: "BeastMode", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=BeastMode", level: 9, xp: 6800, inviteCodes: [] },
];

export const challenges: Challenge[] = [];

export const pendingInvites: ChallengeInvite[] = [
  {
    id: "inv1",
    challengeId: "c1",
    challengeTitle: "100 Push-up Daily",
    challengeType: "push-up",
    invitedBy: "u2",
    invitedByUsername: "IronLady",
    invitedByAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=IronLady",
    createdAt: subDays(new Date(), 1),
  },
  {
    id: "inv2",
    challengeId: "c2",
    challengeTitle: "Marathon Month",
    challengeType: "run",
    invitedBy: "u4",
    invitedByUsername: "Speedy",
    invitedByAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Speedy",
    createdAt: subDays(new Date(), 0),
  },
];
