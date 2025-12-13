import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { setCorsHeaders } from "./lib/cors.js";
import { rateLimit, RateLimits } from "./lib/rate-limit.js";

/**
 * Combined validation endpoint for username and invite code checks
 *
 * GET /api/validate?type=username&username=foo
 * POST /api/validate with { type: 'inviteCode', code: 'ABC123' }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return; // Preflight handled
  }

  // Rate limit to prevent enumeration attacks
  if (rateLimit(req, res, RateLimits.READ)) {
    return; // Rate limit exceeded
  }

  const envError = verifyRequiredEnvVars();
  if (envError) {
    return res.status(503).json({ success: false, error: "Server not fully configured" });
  }

  const type = (req.query.type || req.body?.type) as string;

  if (!type) {
    return res.status(400).json({ success: false, error: "Type parameter required (username or inviteCode)" });
  }

  if (type === "username") {
    return handleUsernameValidation(req, res);
  } else if (type === "inviteCode") {
    return handleInviteCodeValidation(req, res);
  } else {
    return res.status(400).json({ success: false, error: "Invalid type. Use 'username' or 'inviteCode'" });
  }
}

async function handleUsernameValidation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const username = req.query.username as string;

  if (!username) {
    return res.status(400).json({ success: false, error: "Username is required" });
  }

  if (username.length < 3 || username.length > 20) {
    return res.json({ success: true, available: false, reason: "Username must be 3-20 characters" });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.json({ success: true, available: false, reason: "Username can only contain letters, numbers, and underscores" });
  }

  try {
    initializeFirebaseAdmin();
    const { db } = getAdminInstances();

    const existingUser = await db.collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    const available = existingUser.empty;

    return res.json({
      success: true,
      available,
      reason: available ? null : "Username is already taken"
    });
  } catch (error: any) {
    console.error("Username check error:", error);
    return res.status(500).json({ success: false, error: "Failed to check username" });
  }
}

async function handleInviteCodeValidation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ valid: false, error: "Method not allowed" });
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

    const inviteCodeRef = db.collection("inviteCodes").doc(normalizedCode);
    const inviteCodeDoc = await inviteCodeRef.get();

    if (!inviteCodeDoc.exists) {
      return res.json({ valid: false, error: "Invalid invite code" });
    }

    const inviteData = inviteCodeDoc.data();

    if (inviteData?.used) {
      return res.json({ valid: false, error: "Invite code has already been used" });
    }

    return res.json({ valid: true, isMaster: false });
  } catch (error: any) {
    console.error("Invite code validation error:", error);
    return res.status(500).json({ valid: false, error: "Server error" });
  }
}
