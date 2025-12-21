import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyAuthToken, initializeFirebaseAdmin } from "../lib/firebase-admin.js";
import { setCorsHeaders } from "../lib/cors.js";

// Achievement definitions
const ACHIEVEMENTS = [
  // Workout Milestones
  { id: "first_workout", name: "Getting Started", description: "Complete your first workout", icon: "🏁", category: "milestones" },
  { id: "10_workouts", name: "Consistent", description: "Log 10 workouts", icon: "🔥", category: "milestones" },
  { id: "50_workouts", name: "Dedicated", description: "Log 50 workouts", icon: "💪", category: "milestones" },
  { id: "100_workouts", name: "Committed", description: "Log 100 workouts", icon: "⚡", category: "milestones" },
  { id: "500_workouts", name: "Unstoppable", description: "Log 500 workouts", icon: "🚀", category: "milestones" },

  // XP Milestones
  { id: "1k_xp", name: "Rising Star", description: "Earn 1,000 XP", icon: "⭐", category: "xp" },
  { id: "10k_xp", name: "XP Hunter", description: "Earn 10,000 XP", icon: "🎯", category: "xp" },
  { id: "50k_xp", name: "XP Master", description: "Earn 50,000 XP", icon: "👑", category: "xp" },
  { id: "100k_xp", name: "Legend", description: "Earn 100,000 XP", icon: "💎", category: "xp" },

  // Level Milestones
  { id: "level_5", name: "Novice", description: "Reach Level 5", icon: "🥉", category: "levels" },
  { id: "level_10", name: "Intermediate", description: "Reach Level 10", icon: "🥈", category: "levels" },
  { id: "level_20", name: "Advanced", description: "Reach Level 20", icon: "🥇", category: "levels" },
  { id: "level_50", name: "Elite", description: "Reach Level 50", icon: "🏆", category: "levels" },

  // Streak Achievements
  { id: "3_day_streak", name: "Getting Into It", description: "Maintain a 3-day streak", icon: "🔥", category: "streaks" },
  { id: "7_day_streak", name: "Week Warrior", description: "Maintain a 7-day streak", icon: "🌟", category: "streaks" },
  { id: "30_day_streak", name: "Month Master", description: "Maintain a 30-day streak", icon: "💪", category: "streaks" },
  { id: "100_day_streak", name: "Century", description: "Maintain a 100-day streak", icon: "🎖️", category: "streaks" },

  // Exercise-Specific
  { id: "100_pullups", name: "Pull-up Pro", description: "Complete 100 total pull-ups", icon: "💪", category: "exercises" },
  { id: "500_pushups", name: "Push-up King", description: "Complete 500 total push-ups", icon: "👊", category: "exercises" },
  { id: "50km_run", name: "Marathon Ready", description: "Run 50km total", icon: "🏃", category: "exercises" },
  { id: "100_dips", name: "Dip Champion", description: "Complete 100 total dips", icon: "💪", category: "exercises" },

  // Social
  { id: "first_follower", name: "Making Friends", description: "Get your first follower", icon: "👥", category: "social" },
  { id: "10_followers", name: "Popular", description: "Get 10 followers", icon: "🌟", category: "social" },
  { id: "follow_10", name: "Supportive", description: "Follow 10 people", icon: "🤝", category: "social" },

  // Challenge Achievements
  { id: "first_challenge", name: "Challenger", description: "Join your first challenge", icon: "🎯", category: "challenges" },
  { id: "win_challenge", name: "Victory", description: "Win a challenge", icon: "🏆", category: "challenges" },
  { id: "create_challenge", name: "Leader", description: "Create a challenge", icon: "📋", category: "challenges" },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return;
  }

  initializeFirebaseAdmin();

  if (req.method === "GET") {
    return handleGetAchievements(req, res);
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGetAchievements(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await verifyAuthToken(req.headers.authorization as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const userData = userDoc.data()!;

    // Get workout count
    const logsSnapshot = await db.collection("exercise_logs")
      .where("userId", "==", userId)
      .get();
    const totalWorkouts = logsSnapshot.size;

    // Get challenge participation
    const challengesSnapshot = await db.collection("challenges")
      .where("participantIds", "array-contains", userId)
      .get();
    const totalChallenges = challengesSnapshot.size;

    // Get challenges created
    const createdChallengesSnapshot = await db.collection("challenges")
      .where("createdBy", "==", userId)
      .get();
    const createdChallenges = createdChallengesSnapshot.size;

    // Calculate current streak
    const logs = logsSnapshot.docs.map(doc => doc.data());
    const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = today.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const workoutDates = new Set(
      sortedLogs.map(log => {
        const d = new Date(log.timestamp);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    while (workoutDates.has(currentDate)) {
      streak++;
      currentDate -= dayMs;
    }

    // Check which achievements are unlocked
    const unlockedAchievements = ACHIEVEMENTS.filter(achievement => {
      switch (achievement.id) {
        // Workout milestones
        case "first_workout": return totalWorkouts >= 1;
        case "10_workouts": return totalWorkouts >= 10;
        case "50_workouts": return totalWorkouts >= 50;
        case "100_workouts": return totalWorkouts >= 100;
        case "500_workouts": return totalWorkouts >= 500;

        // XP milestones
        case "1k_xp": return userData.xp >= 1000;
        case "10k_xp": return userData.xp >= 10000;
        case "50k_xp": return userData.xp >= 50000;
        case "100k_xp": return userData.xp >= 100000;

        // Level milestones
        case "level_5": return userData.level >= 5;
        case "level_10": return userData.level >= 10;
        case "level_20": return userData.level >= 20;
        case "level_50": return userData.level >= 50;

        // Streak achievements
        case "3_day_streak": return streak >= 3;
        case "7_day_streak": return streak >= 7;
        case "30_day_streak": return streak >= 30;
        case "100_day_streak": return streak >= 100;

        // Exercise-specific
        case "100_pullups": return (userData.totalPullups || 0) >= 100;
        case "500_pushups": return (userData.totalPushups || 0) >= 500;
        case "50km_run": return (userData.totalRunningKm || 0) >= 50;
        case "100_dips": return (userData.totalDips || 0) >= 100;

        // Social
        case "first_follower": return (userData.followerCount || 0) >= 1;
        case "10_followers": return (userData.followerCount || 0) >= 10;
        case "follow_10": return (userData.followingCount || 0) >= 10;

        // Challenges
        case "first_challenge": return totalChallenges >= 1;
        case "create_challenge": return createdChallenges >= 1;
        case "win_challenge": {
          // Check if user won any challenge (highest progress among participants)
          for (const challengeDoc of challengesSnapshot.docs) {
            const challengeData = challengeDoc.data();
            if (challengeData.endDate && challengeData.endDate < Date.now()) {
              const participants = challengeData.participants || [];
              const sorted = participants.sort((a: any, b: any) => b.progress - a.progress);
              if (sorted[0]?.userId === userId && sorted[0]?.progress > 0) {
                return true;
              }
            }
          }
          return false;
        }

        default: return false;
      }
    }).map(a => a.id);

    // Get progress for locked achievements
    const achievementsWithProgress = ACHIEVEMENTS.map(achievement => {
      const isUnlocked = unlockedAchievements.includes(achievement.id);
      let progress = 0;
      let total = 1;

      if (!isUnlocked) {
        switch (achievement.id) {
          case "10_workouts": progress = totalWorkouts; total = 10; break;
          case "50_workouts": progress = totalWorkouts; total = 50; break;
          case "100_workouts": progress = totalWorkouts; total = 100; break;
          case "500_workouts": progress = totalWorkouts; total = 500; break;
          case "1k_xp": progress = userData.xp; total = 1000; break;
          case "10k_xp": progress = userData.xp; total = 10000; break;
          case "50k_xp": progress = userData.xp; total = 50000; break;
          case "100k_xp": progress = userData.xp; total = 100000; break;
          case "level_5": progress = userData.level; total = 5; break;
          case "level_10": progress = userData.level; total = 10; break;
          case "level_20": progress = userData.level; total = 20; break;
          case "level_50": progress = userData.level; total = 50; break;
          case "3_day_streak": progress = streak; total = 3; break;
          case "7_day_streak": progress = streak; total = 7; break;
          case "30_day_streak": progress = streak; total = 30; break;
          case "100_day_streak": progress = streak; total = 100; break;
          case "100_pullups": progress = userData.totalPullups || 0; total = 100; break;
          case "500_pushups": progress = userData.totalPushups || 0; total = 500; break;
          case "50km_run": progress = userData.totalRunningKm || 0; total = 50; break;
          case "100_dips": progress = userData.totalDips || 0; total = 100; break;
          case "10_followers": progress = userData.followerCount || 0; total = 10; break;
          case "follow_10": progress = userData.followingCount || 0; total = 10; break;
        }
      }

      return {
        ...achievement,
        unlocked: isUnlocked,
        progress: isUnlocked ? total : progress,
        total,
      };
    });

    return res.json({
      success: true,
      achievements: achievementsWithProgress,
      totalUnlocked: unlockedAchievements.length,
      totalAchievements: ACHIEVEMENTS.length,
    });
  } catch (error: any) {
    console.error("Get achievements error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get achievements" });
  }
}
