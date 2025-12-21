import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, verifyAuthToken, verifyTokenFromBody, initializeFirebaseAdmin } from "../lib/firebase-admin.js";
import { setCorsHeaders } from "../lib/cors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return; // Preflight handled
  }

  const envError = verifyRequiredEnvVars();
  if (envError) {
    return res.status(503).json({ success: false, error: "Server not fully configured" });
  }

  initializeFirebaseAdmin();

  const { action, id } = req.query;

  if (req.method === "GET") {
    return handleGetChallenges(req, res);
  } else if (req.method === "POST") {
    if (action === "join" && id) {
      return handleJoinChallenge(req, res, id as string);
    } else if (action === "invite" && id) {
      return handleInviteToChallenge(req, res, id as string);
    } else {
      return handleCreateChallenge(req, res);
    }
  } else if (req.method === "PATCH" && id) {
    return handleUpdateChallenge(req, res, id as string);
  } else if (req.method === "DELETE" && id) {
    return handleDeleteChallenge(req, res, id as string);
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
      .orderBy("createdAt", "desc")
      .limit(100)
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

    const now = Date.now();
    const start = startDate ? new Date(startDate) : new Date();
    const startTime = start.getTime();

    // Validate start date is not too far in the past (more than 7 days ago)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    if (startTime < sevenDaysAgo) {
      return res.status(400).json({
        success: false,
        error: "Start date cannot be more than 7 days in the past"
      });
    }

    // Validate start date is not too far in the future (more than 1 year)
    const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);
    if (startTime > oneYearFromNow) {
      return res.status(400).json({
        success: false,
        error: "Start date cannot be more than 1 year in the future"
      });
    }

    // Validate duration is reasonable (max 1 year)
    if (numericDuration > 365) {
      return res.status(400).json({
        success: false,
        error: "Challenge duration cannot exceed 365 days"
      });
    }

    const durationMs = numericDuration * 24 * 60 * 60 * 1000;
    const end = new Date(startTime + durationMs);
    const endTime = end.getTime();

    // Validate end date is after start date (should always be true with positive duration, but verify)
    if (endTime <= startTime) {
      return res.status(400).json({
        success: false,
        error: "Challenge end date must be after start date"
      });
    }

    const challengeData = {
      title,
      description: `Created by ${creatorData.username}`,
      type: exerciseType,
      goal: numericGoal,
      startDate: startTime,
      endDate: endTime,
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

async function handleJoinChallenge(req: VercelRequest, res: VercelResponse, id: string) {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, error: "Missing token" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const challengeRef = db.collection("challenges").doc(id);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return res.status(404).json({ success: false, error: "Challenge not found" });
    }

    const challengeData = challengeDoc.data()!;

    if (challengeData.participantIds?.includes(userId)) {
      return res.status(400).json({ success: false, error: "Already a participant" });
    }

    if (!challengeData.isPublic) {
      return res.status(403).json({ success: false, error: "Challenge is private" });
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const userData = userDoc.data()!;

    const newParticipant = {
      userId,
      username: userData.username,
      avatar: userData.avatar,
      progress: 0,
      joinedAt: Date.now(),
    };

    await challengeRef.update({
      participantIds: [...(challengeData.participantIds || []), userId],
      participants: [...(challengeData.participants || []), newParticipant],
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Join challenge error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to join challenge" });
  }
}

async function handleInviteToChallenge(req: VercelRequest, res: VercelResponse, id: string) {
  const { idToken, inviteeId } = req.body;

  if (!idToken || !inviteeId) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const challengeRef = db.collection("challenges").doc(id);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return res.status(404).json({ success: false, error: "Challenge not found" });
    }

    const challengeData = challengeDoc.data()!;

    if (!challengeData.participantIds?.includes(userId)) {
      return res.status(403).json({ success: false, error: "Only participants can invite others" });
    }

    if (challengeData.participantIds?.includes(inviteeId)) {
      return res.status(400).json({ success: false, error: "User is already a participant" });
    }

    const inviterDoc = await db.collection("users").doc(userId).get();
    if (!inviterDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const inviterData = inviterDoc.data()!;

    const inviteeDoc = await db.collection("users").doc(inviteeId).get();
    if (!inviteeDoc.exists) {
      return res.status(404).json({ success: false, error: "Invitee not found" });
    }

    const existingInvite = await db.collection("challengeInvites")
      .where("challengeId", "==", id)
      .where("invitedUserId", "==", inviteeId)
      .where("status", "==", "pending")
      .get();

    if (!existingInvite.empty) {
      return res.status(400).json({ success: false, error: "Invite already sent" });
    }

    const now = Date.now();
    const inviteRef = await db.collection("challengeInvites").add({
      challengeId: id,
      challengeTitle: challengeData.title,
      challengeType: challengeData.type,
      invitedUserId: inviteeId,
      invitedBy: userId,
      invitedByUsername: inviterData.username,
      invitedByAvatar: inviterData.avatar,
      status: "pending",
      createdAt: now,
      expiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days from now
    });

    return res.json({ success: true, inviteId: inviteRef.id });
  } catch (error: any) {
    console.error("Send invite error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to send invite" });
  }
}

async function handleUpdateChallenge(req: VercelRequest, res: VercelResponse, id: string) {
  const { idToken, title, description, goal, endDate } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, error: "Missing token" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const challengeRef = db.collection("challenges").doc(id);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return res.status(404).json({ success: false, error: "Challenge not found" });
    }

    const challengeData = challengeDoc.data()!;

    // Only creator can update
    if (challengeData.createdBy !== userId) {
      return res.status(403).json({ success: false, error: "Only the creator can update this challenge" });
    }

    // Build update object
    const updateData: Record<string, any> = {};

    if (title !== undefined) {
      if (title.length < 3 || title.length > 100) {
        return res.status(400).json({ success: false, error: "Title must be 3-100 characters" });
      }
      updateData.title = title;
    }

    if (description !== undefined) {
      if (description.length > 500) {
        return res.status(400).json({ success: false, error: "Description too long (max 500 characters)" });
      }
      updateData.description = description;
    }

    if (goal !== undefined) {
      if (typeof goal !== 'number' || goal <= 0) {
        return res.status(400).json({ success: false, error: "Goal must be a positive number" });
      }
      updateData.goal = goal;
    }

    if (endDate !== undefined) {
      if (endDate <= Date.now()) {
        return res.status(400).json({ success: false, error: "End date must be in the future" });
      }
      updateData.endDate = endDate;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    updateData.updatedAt = Date.now();

    await challengeRef.update(updateData);

    return res.json({ success: true, updated: updateData });
  } catch (error: any) {
    console.error("Update challenge error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to update challenge" });
  }
}

async function handleDeleteChallenge(req: VercelRequest, res: VercelResponse, id: string) {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, error: "Missing token" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const challengeRef = db.collection("challenges").doc(id);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return res.status(404).json({ success: false, error: "Challenge not found" });
    }

    const challengeData = challengeDoc.data()!;

    // Only creator can delete
    if (challengeData.createdBy !== userId) {
      return res.status(403).json({ success: false, error: "Only the creator can delete this challenge" });
    }

    // Delete associated invites
    const invitesSnapshot = await db.collection("challengeInvites")
      .where("challengeId", "==", id)
      .get();

    const batch = db.batch();
    batch.delete(challengeRef);

    invitesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Delete challenge error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to delete challenge" });
  }
}
