import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyAuthToken, verifyTokenFromBody, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { setCorsHeaders } from "./lib/cors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return; // Preflight handled
  }

  initializeFirebaseAdmin();

  const { action } = req.query;

  if (req.method === "GET") {
    if (action === "search") {
      return handleSearchUsers(req, res);
    } else if (action === "followers") {
      return handleGetFollowers(req, res);
    } else if (action === "following") {
      return handleGetFollowing(req, res);
    } else if (action === "feed") {
      return handleGetFeed(req, res);
    }
    return res.status(400).json({ success: false, error: "Invalid action" });
  } else if (req.method === "POST") {
    if (action === "follow") {
      return handleFollow(req, res);
    } else if (action === "unfollow") {
      return handleUnfollow(req, res);
    }
    return res.status(400).json({ success: false, error: "Invalid action" });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleSearchUsers(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await verifyAuthToken(req.headers.authorization as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { query } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Search query required" });
    }

    const searchTerm = query.toLowerCase().trim();
    if (searchTerm.length < 2) {
      return res.status(400).json({ success: false, error: "Search term must be at least 2 characters" });
    }

    const { db } = getAdminInstances();

    // Search by username (case-insensitive prefix match)
    const usersSnapshot = await db.collection("users")
      .orderBy("username")
      .startAt(searchTerm)
      .endAt(searchTerm + '\uf8ff')
      .limit(20)
      .get();

    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: doc.id,
        username: data.username,
        avatar: data.avatar,
        level: data.level,
        xp: data.xp,
      };
    }).filter(u => u.userId !== user.userId); // Exclude current user

    return res.json({ success: true, users });
  } catch (error: any) {
    console.error("Search users error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to search users" });
  }
}

async function handleFollow(req: VercelRequest, res: VercelResponse) {
  const { idToken, targetUserId } = req.body;

  if (!idToken || !targetUserId) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    if (userId === targetUserId) {
      return res.status(400).json({ success: false, error: "Cannot follow yourself" });
    }

    // Check if target user exists
    const targetUserDoc = await db.collection("users").doc(targetUserId).get();
    if (!targetUserDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check if already following
    const followDoc = await db.collection("follows")
      .where("followerId", "==", userId)
      .where("followingId", "==", targetUserId)
      .get();

    if (!followDoc.empty) {
      return res.status(400).json({ success: false, error: "Already following this user" });
    }

    // Create follow relationship
    await db.collection("follows").add({
      followerId: userId,
      followingId: targetUserId,
      createdAt: Date.now(),
    });

    // Update follower/following counts
    const batch = db.batch();

    const followerRef = db.collection("users").doc(userId);
    batch.update(followerRef, {
      followingCount: (await followerRef.get()).data()?.followingCount || 0 + 1,
    });

    const followingRef = db.collection("users").doc(targetUserId);
    batch.update(followingRef, {
      followerCount: (await followingRef.get()).data()?.followerCount || 0 + 1,
    });

    await batch.commit();

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Follow user error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to follow user" });
  }
}

async function handleUnfollow(req: VercelRequest, res: VercelResponse) {
  const { idToken, targetUserId } = req.body;

  if (!idToken || !targetUserId) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    // Find and delete the follow relationship
    const followSnapshot = await db.collection("follows")
      .where("followerId", "==", userId)
      .where("followingId", "==", targetUserId)
      .get();

    if (followSnapshot.empty) {
      return res.status(400).json({ success: false, error: "Not following this user" });
    }

    const batch = db.batch();

    // Delete follow document
    followSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Update counts
    const followerRef = db.collection("users").doc(userId);
    const followerData = (await followerRef.get()).data();
    batch.update(followerRef, {
      followingCount: Math.max(0, (followerData?.followingCount || 1) - 1),
    });

    const followingRef = db.collection("users").doc(targetUserId);
    const followingData = (await followingRef.get()).data();
    batch.update(followingRef, {
      followerCount: Math.max(0, (followingData?.followerCount || 1) - 1),
    });

    await batch.commit();

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Unfollow user error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to unfollow user" });
  }
}

async function handleGetFollowers(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await verifyAuthToken(req.headers.authorization as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { userId } = req.query;
    const targetUserId = userId || user.userId;

    const { db } = getAdminInstances();

    // Get all follow relationships where this user is being followed
    const followsSnapshot = await db.collection("follows")
      .where("followingId", "==", targetUserId)
      .get();

    const followerIds = followsSnapshot.docs.map(doc => doc.data().followerId);

    if (followerIds.length === 0) {
      return res.json({ success: true, followers: [] });
    }

    // Get user details for all followers (Firestore doesn't support 'in' queries with > 10 items, so chunk)
    const followers = [];
    for (let i = 0; i < followerIds.length; i += 10) {
      const chunk = followerIds.slice(i, i + 10);
      const usersSnapshot = await db.collection("users")
        .where("__name__", "in", chunk)
        .get();

      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        followers.push({
          userId: doc.id,
          username: data.username,
          avatar: data.avatar,
          level: data.level,
          xp: data.xp,
        });
      });
    }

    return res.json({ success: true, followers });
  } catch (error: any) {
    console.error("Get followers error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get followers" });
  }
}

async function handleGetFollowing(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await verifyAuthToken(req.headers.authorization as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { userId } = req.query;
    const targetUserId = userId || user.userId;

    const { db } = getAdminInstances();

    // Get all follow relationships where this user is following others
    const followsSnapshot = await db.collection("follows")
      .where("followerId", "==", targetUserId)
      .get();

    const followingIds = followsSnapshot.docs.map(doc => doc.data().followingId);

    if (followingIds.length === 0) {
      return res.json({ success: true, following: [] });
    }

    // Get user details for all following
    const following = [];
    for (let i = 0; i < followingIds.length; i += 10) {
      const chunk = followingIds.slice(i, i + 10);
      const usersSnapshot = await db.collection("users")
        .where("__name__", "in", chunk)
        .get();

      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        following.push({
          userId: doc.id,
          username: data.username,
          avatar: data.avatar,
          level: data.level,
          xp: data.xp,
        });
      });
    }

    return res.json({ success: true, following });
  } catch (error: any) {
    console.error("Get following error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get following" });
  }
}

async function handleGetFeed(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await verifyAuthToken(req.headers.authorization as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    // Get users the current user is following
    const followingSnapshot = await db.collection("follows")
      .where("followerId", "==", userId)
      .get();

    const followingIds = followingSnapshot.docs.map(doc => doc.data().followingId);

    // Include own activities
    followingIds.push(userId);

    if (followingIds.length === 0) {
      return res.json({ success: true, activities: [] });
    }

    // Get recent workouts from followed users (up to 50)
    const activities = [];
    for (let i = 0; i < followingIds.length && i < 10; i += 10) {
      const chunk = followingIds.slice(i, i + 10);
      const logsSnapshot = await db.collection("exercise_logs")
        .where("userId", "in", chunk)
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();

      for (const doc of logsSnapshot.docs) {
        const logData = doc.data();

        // Get user info
        const userDoc = await db.collection("users").doc(logData.userId).get();
        const userData = userDoc.data();

        activities.push({
          id: doc.id,
          type: "workout",
          userId: logData.userId,
          username: userData?.username,
          avatar: userData?.avatar,
          exerciseType: logData.exerciseType,
          amount: logData.amount,
          unit: logData.unit || (logData.exerciseType === "run" ? "km" : "reps"),
          timestamp: logData.timestamp,
          xpGained: logData.xpGained,
        });
      }
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => b.timestamp - a.timestamp);

    return res.json({ success: true, activities: activities.slice(0, 50) });
  } catch (error: any) {
    console.error("Get feed error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get feed" });
  }
}
