import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { setCorsHeaders } from "./lib/cors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return; // Preflight handled
  }

  if (req.method !== "POST") {
    return res.status(405).json({ valid: false, error: "Method not allowed" });
  }

  const envError = verifyRequiredEnvVars();
  if (envError) {
    return res.status(503).json({ valid: false, error: "Server not configured" });
  }

  const { code } = req.body;
  const masterCode = process.env.MASTER_INVITE_CODE;
  const normalizedCode = code?.trim().toUpperCase();

  if (!normalizedCode) {
    return res.status(400).json({ valid: false, error: "No code provided" });
  }

  if (normalizedCode === masterCode?.toUpperCase()) {
    return res.json({ valid: true, isMaster: true });
  }

  try {
    initializeFirebaseAdmin();
    const { db } = getAdminInstances();
    const inviteCodeDoc = await db.collection("inviteCodes").doc(normalizedCode).get();

    if (!inviteCodeDoc.exists) {
      return res.json({ valid: false, isMaster: false });
    }

    const inviteData = inviteCodeDoc.data();
    if (inviteData?.used) {
      return res.json({ valid: false, isMaster: false, reason: "Code already used" });
    }

    return res.json({
      valid: true,
      isMaster: false,
      inviterUserId: inviteData?.createdBy,
    });
  } catch (error: any) {
    console.error("Error validating invite code:", error);
    return res.status(500).json({ valid: false, error: "Server error" });
  }
}
