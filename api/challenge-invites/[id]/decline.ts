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
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, error: "Missing token" });
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

    await inviteRef.update({ status: "declined", declinedAt: Date.now() });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Decline invite error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to decline invite" });
  }
}
