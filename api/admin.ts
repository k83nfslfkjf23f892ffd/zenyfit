import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyAuthToken, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { setCorsHeaders } from "./lib/cors.js";

// Admin user IDs - in production, this would be in an environment variable or database
const ADMIN_USERS = (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean);

async function isAdmin(userId: string): Promise<boolean> {
  // For now, check against env variable list
  // In production, you'd check a user's admin role in Firestore
  if (ADMIN_USERS.includes(userId)) return true;

  // Also check Firestore for admin flag
  const { db } = getAdminInstances();
  const userDoc = await db.collection("users").doc(userId).get();
  return userDoc.exists && userDoc.data()?.isAdmin === true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return;
  }

  initializeFirebaseAdmin();

  const { action } = req.query;

  // Verify user is authenticated and is admin
  const user = await verifyAuthToken(req.headers.authorization as string);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const userIsAdmin = await isAdmin(user.userId);
  if (!userIsAdmin) {
    return res.status(403).json({ success: false, error: "Forbidden - Admin access required" });
  }

  if (req.method === "GET") {
    if (action === "stats") {
      return handleGetStats(req, res);
    } else if (action === "users") {
      return handleGetUsers(req, res);
    } else if (action === "activity") {
      return handleGetRecentActivity(req, res);
    }
    return res.status(400).json({ success: false, error: "Invalid action" });
  } else if (req.method === "POST") {
    if (action === "ban") {
      return handleBanUser(req, res);
    } else if (action === "unban") {
      return handleUnbanUser(req, res);
    } else if (action === "promote") {
      return handlePromoteToAdmin(req, res);
    }
    return res.status(400).json({ success: false, error: "Invalid action" });
  } else if (req.method === "DELETE") {
    if (action === "user") {
      return handleDeleteUser(req, res);
    }
    return res.status(400).json({ success: false, error: "Invalid action" });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGetStats(req: VercelRequest, res: VercelResponse) {
  try {
    const { db } = getAdminInstances();

    // Get total users
    const usersSnapshot = await db.collection("users").get();
    const totalUsers = usersSnapshot.size;

    // Get total workouts
    const logsSnapshot = await db.collection("exercise_logs").get();
    const totalWorkouts = logsSnapshot.size;

    // Get total challenges
    const challengesSnapshot = await db.collection("challenges").get();
    const totalChallenges = challengesSnapshot.size;

    // Calculate total XP earned across all users
    let totalXP = 0;
    usersSnapshot.docs.forEach(doc => {
      totalXP += doc.data().xp || 0;
    });

    // Get new users in last 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const newUsers = usersSnapshot.docs.filter(doc =>
      (doc.data().createdAt || 0) >= sevenDaysAgo
    ).length;

    // Get active users (logged workout in last 7 days)
    const recentLogs = logsSnapshot.docs.filter(doc =>
      (doc.data().timestamp || 0) >= sevenDaysAgo
    );
    const activeUserIds = new Set(recentLogs.map(doc => doc.data().userId));
    const activeUsers = activeUserIds.size;

    // Get top users by XP
    const topUsers = usersSnapshot.docs
      .map(doc => ({
        userId: doc.id,
        username: doc.data().username,
        xp: doc.data().xp || 0,
        level: doc.data().level || 1,
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10);

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalWorkouts,
        totalChallenges,
        totalXP,
        newUsers,
        activeUsers,
        topUsers,
      },
    });
  } catch (error: any) {
    console.error("Get admin stats error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get stats" });
  }
}

async function handleGetUsers(req: VercelRequest, res: VercelResponse) {
  try {
    const { db } = getAdminInstances();
    const { page = "1", limit = "50", search = "" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    let usersQuery = db.collection("users").orderBy("createdAt", "desc");

    const snapshot = await usersQuery.get();

    let users = snapshot.docs.map(doc => ({
      userId: doc.id,
      username: doc.data().username,
      email: doc.data().email,
      level: doc.data().level,
      xp: doc.data().xp,
      createdAt: doc.data().createdAt,
      isBanned: doc.data().isBanned || false,
      isAdmin: doc.data().isAdmin || false,
      followerCount: doc.data().followerCount || 0,
      followingCount: doc.data().followingCount || 0,
    }));

    // Filter by search if provided
    if (search && typeof search === "string") {
      const searchLower = search.toLowerCase();
      users = users.filter(u =>
        u.username.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower)
      );
    }

    // Paginate
    const total = users.length;
    const start = (pageNum - 1) * limitNum;
    const paginatedUsers = users.slice(start, start + limitNum);

    return res.json({
      success: true,
      users: paginatedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Get users error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get users" });
  }
}

async function handleGetRecentActivity(req: VercelRequest, res: VercelResponse) {
  try {
    const { db } = getAdminInstances();

    // Get recent workouts
    const logsSnapshot = await db.collection("exercise_logs")
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const activities = [];

    for (const doc of logsSnapshot.docs) {
      const logData = doc.data();
      const userDoc = await db.collection("users").doc(logData.userId).get();
      const userData = userDoc.data();

      activities.push({
        id: doc.id,
        type: "workout",
        userId: logData.userId,
        username: userData?.username,
        exerciseType: logData.exerciseType,
        amount: logData.amount,
        timestamp: logData.timestamp,
      });
    }

    return res.json({ success: true, activities });
  } catch (error: any) {
    console.error("Get recent activity error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get activity" });
  }
}

async function handleBanUser(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  try {
    const { db } = getAdminInstances();

    const userRef = db.collection("users").doc(userId);
    await userRef.update({ isBanned: true, bannedAt: Date.now() });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Ban user error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to ban user" });
  }
}

async function handleUnbanUser(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  try {
    const { db } = getAdminInstances();

    const userRef = db.collection("users").doc(userId);
    await userRef.update({ isBanned: false, bannedAt: null });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Unban user error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to unban user" });
  }
}

async function handlePromoteToAdmin(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  try {
    const { db } = getAdminInstances();

    const userRef = db.collection("users").doc(userId);
    await userRef.update({ isAdmin: true });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Promote user error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to promote user" });
  }
}

async function handleDeleteUser(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  try {
    const { db, auth } = getAdminInstances();

    // Delete user's data
    const batch = db.batch();

    // Delete exercise logs
    const logsSnapshot = await db.collection("exercise_logs")
      .where("userId", "==", userId)
      .get();
    logsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete from challenges (remove from participants)
    const challengesSnapshot = await db.collection("challenges")
      .where("participantIds", "array-contains", userId)
      .get();

    for (const challengeDoc of challengesSnapshot.docs) {
      const challengeData = challengeDoc.data();
      const updatedParticipants = (challengeData.participants || []).filter((p: any) => p.userId !== userId);
      const updatedParticipantIds = (challengeData.participantIds || []).filter((id: string) => id !== userId);

      batch.update(challengeDoc.ref, {
        participants: updatedParticipants,
        participantIds: updatedParticipantIds,
      });
    }

    // Delete follows
    const followsSnapshot = await db.collection("follows")
      .where("followerId", "==", userId)
      .get();
    followsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    const followedBySnapshot = await db.collection("follows")
      .where("followingId", "==", userId)
      .get();
    followedBySnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete user document
    batch.delete(db.collection("users").doc(userId));

    await batch.commit();

    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to delete user" });
  }
}
