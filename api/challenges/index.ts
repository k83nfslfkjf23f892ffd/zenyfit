import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, verifyAuthToken, verifyTokenFromBody, initializeFirebaseAdmin } from "../lib/firebase-admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const envError = verifyRequiredEnvVars();
  if (envError) {
    return res.status(503).json({ success: false, error: "Server not fully configured" });
  }

  initializeFirebaseAdmin();

  if (req.method === "GET") {
    return handleGetChallenges(req, res);
  } else if (req.method === "POST") {
    return handleCreateChallenge(req, res);
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGetChallenges(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await verifyAuthToken(req.headers.authorization as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const participantChallengesSnapshot = await db.collection("challenges")
      .where("participantIds", "array-contains", userId)
      .get();

    const publicChallengesSnapshot = await db.collection("challenges")
      .where("isPublic", "==", true)
      .get();

    const challengeMap = new Map();

    for (const doc of participantChallengesSnapshot.docs) {
      challengeMap.set(doc.id, { id: doc.id, ...doc.data() });
    }

    for (const doc of publicChallengesSnapshot.docs) {
      if (!challengeMap.has(doc.id)) {
        challengeMap.set(doc.id, { id: doc.id, ...doc.data() });
      }
    }

    const challenges = Array.from(challengeMap.values());

    return res.json({ success: true, challenges, userId });
  } catch (error: any) {
    console.error("Get challenges error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get challenges" });
  }
}

async function handleCreateChallenge(req: VercelRequest, res: VercelResponse) {
  const { idToken, title, exerciseType, goal, durationDays, startDate, isPublic, inviteeIds, colors } = req.body;

  if (!idToken || !title || !exerciseType) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const numericGoal = Number(goal);
  const numericDuration = Number(durationDays);

  if (!Number.isFinite(numericGoal) || numericGoal <= 0) {
    return res.status(400).json({ success: false, error: "Goal must be a positive number" });
  }

  if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
    return res.status(400).json({ success: false, error: "Duration must be a positive number" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const creatorDoc = await db.collection("users").doc(userId).get();
    if (!creatorDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const creatorData = creatorDoc.data()!;

    const start = startDate ? new Date(startDate) : new Date();
    const durationMs = numericDuration * 24 * 60 * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);

    const challengeData = {
      title,
      description: `Created by ${creatorData.username}`,
      type: exerciseType,
      goal: numericGoal,
      startDate: start.getTime(),
      endDate: end.getTime(),
      isPublic: isPublic ?? true,
      createdBy: userId,
      createdAt: Date.now(),
      participantIds: [userId],
      participants: [{
        userId,
        username: creatorData.username,
        avatar: creatorData.avatar,
        progress: 0,
        joinedAt: Date.now(),
      }],
      colors: colors || {
        from: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
        to: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
      },
    };

    const challengeRef = await db.collection("challenges").add(challengeData);

    if (inviteeIds && inviteeIds.length > 0) {
      for (const inviteeId of inviteeIds) {
        if (inviteeId === userId) continue;

        const inviteeDoc = await db.collection("users").doc(inviteeId).get();
        if (!inviteeDoc.exists) continue;

        await db.collection("challengeInvites").add({
          challengeId: challengeRef.id,
          challengeTitle: title,
          challengeType: exerciseType,
          invitedUserId: inviteeId,
          invitedBy: userId,
          invitedByUsername: creatorData.username,
          invitedByAvatar: creatorData.avatar,
          status: "pending",
          createdAt: Date.now(),
        });
      }
    }

    return res.json({
      success: true,
      challengeId: challengeRef.id,
      challenge: { id: challengeRef.id, ...challengeData },
    });
  } catch (error: any) {
    console.error("Create challenge error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to create challenge" });
  }
}
