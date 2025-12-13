import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { setCorsHeaders } from "./lib/cors.js";
import { rateLimit, RateLimits } from "./lib/rate-limit.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return; // Preflight handled
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Rate limit to prevent account enumeration
  if (rateLimit(req, res, RateLimits.READ)) {
    return; // Rate limit exceeded
  }

  const envError = verifyRequiredEnvVars();
  if (envError) {
    return res.status(503).json({ success: false, error: "Server not fully configured" });
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
      reason: available ? null : "Username already taken",
    });
  } catch (error: any) {
    console.error("Check username error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to check username" });
  }
}
