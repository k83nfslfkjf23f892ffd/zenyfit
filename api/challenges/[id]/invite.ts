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
  const { idToken, inviteeId } = req.body;

  if (!idToken || !inviteeId) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    initializeFirebaseAdmin();
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const challengeRef = db.collection("challenges").doc(id as string);
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

    const inviteRef = await db.collection("challengeInvites").add({
      challengeId: id,
      challengeTitle: challengeData.title,
      challengeType: challengeData.type,
      invitedUserId: inviteeId,
      invitedBy: userId,
      invitedByUsername: inviterData.username,
      invitedByAvatar: inviterData.avatar,
      status: "pending",
      createdAt: Date.now(),
    });

    return res.json({ success: true, inviteId: inviteRef.id });
  } catch (error: any) {
    console.error("Send invite error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to send invite" });
  }
}
