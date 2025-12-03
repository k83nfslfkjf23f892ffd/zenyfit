import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, verifyTokenFromBody, initializeFirebaseAdmin } from "../../lib/firebase-admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const envError = verifyRequiredEnvVars();
  if (envError) {
    return res.status(503).json({ success: false, error: "Server not fully configured" });
  }

  const { id } = req.query;
  const { idToken, action } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, error: "Missing token" });
  }

  if (!action || !["accept", "decline"].includes(action)) {
    return res.status(400).json({ success: false, error: "Invalid action. Use 'accept' or 'decline'" });
  }

  try {
    initializeFirebaseAdmin();
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const inviteRef = db.collection("challengeInvites").doc(id as string);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return res.status(404).json({ success: false, error: "Invite not found" });
    }

    const inviteData = inviteDoc.data()!;

    if (inviteData.invitedUserId !== userId) {
      return res.status(403).json({ success: false, error: "Not your invite" });
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
