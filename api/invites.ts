import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, verifyAuthToken, verifyTokenFromBody, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { setCorsHeaders } from "./lib/cors.js";

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
    return handleGetInvites(req, res);
  } else if (req.method === "POST") {
    if (action === "respond" && id) {
      return handleRespondToInvite(req, res, id as string);
    }
    return res.status(400).json({ success: false, error: "Invalid action" });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGetInvites(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await verifyAuthToken(req.headers.authorization as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const invitesSnapshot = await db.collection("challengeInvites")
      .where("invitedUserId", "==", userId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get();

    // Filter out expired invites and auto-mark them as expired
    const now = Date.now();
    const invites = [];
    const batch = db.batch();

    for (const doc of invitesSnapshot.docs) {
      const data = doc.data();
      if (data.expiresAt && data.expiresAt < now) {
        // Mark as expired
        batch.update(doc.ref, { status: "expired" });
      } else {
        invites.push({
          id: doc.id,
          ...data,
        });
      }
    }

    if (invites.length !== invitesSnapshot.docs.length) {
      await batch.commit(); // Clean up expired invites
    }

    return res.json({ success: true, invites });
  } catch (error: any) {
    console.error("Get challenge invites error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get invites" });
  }
}

async function handleRespondToInvite(req: VercelRequest, res: VercelResponse, id: string) {
  const { idToken, action } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, error: "Missing token" });
  }

  if (!action || !["accept", "decline"].includes(action)) {
    return res.status(400).json({ success: false, error: "Invalid action. Use 'accept' or 'decline'" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const inviteRef = db.collection("challengeInvites").doc(id);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return res.status(404).json({ success: false, error: "Invite not found" });
    }

    const inviteData = inviteDoc.data()!;

    if (inviteData.invitedUserId !== userId) {
      return res.status(403).json({ success: false, error: "Not your invite" });
    }

    // Check if invite has expired (30 days)
    if (inviteData.expiresAt && inviteData.expiresAt < Date.now()) {
      await inviteRef.update({ status: "expired" });
      return res.status(400).json({ success: false, error: "Invite has expired" });
    }

    if (action === "decline") {
      await inviteRef.update({ status: "declined", declinedAt: Date.now() });
      return res.json({ success: true });
    }

    if (inviteData.status !== "pending") {
      return res.status(400).json({ success: false, error: "Invite already processed" });
    }

    const challengeRef = db.collection("challenges").doc(inviteData.challengeId);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      await inviteRef.update({ status: "expired" });
      return res.status(404).json({ success: false, error: "Challenge no longer exists" });
    }

    const challengeData = challengeDoc.data()!;

    if (challengeData.participantIds?.includes(userId)) {
      await inviteRef.update({ status: "accepted" });
      return res.json({ success: true, message: "Already a participant" });
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

    await inviteRef.update({ status: "accepted", acceptedAt: Date.now() });

    return res.json({ success: true, challengeId: inviteData.challengeId });
  } catch (error: any) {
    console.error("Respond to invite error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to respond to invite" });
  }
}
