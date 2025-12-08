import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, initializeFirebaseAdmin } from "./lib/firebase-admin.js";

function generateAvatar(username: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
}

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

  const { username, password, inviteCode } = req.body;
  const masterCode = process.env.MASTER_INVITE_CODE;
  const normalizedCode = inviteCode?.trim().toUpperCase();

  if (!username || !password || !normalizedCode) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ success: false, error: "Username must be 3-20 characters" });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ success: false, error: "Username can only contain letters, numbers, and underscores" });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
  }

  const isMasterCode = normalizedCode === masterCode?.trim().toUpperCase();

  let createdUserId: string | null = null;

  try {
    initializeFirebaseAdmin();
    const { db, auth } = getAdminInstances();
    const email = `${username.toLowerCase()}@zenyfit.local`;

    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: username,
      });
      createdUserId = userRecord.uid;
    } catch (authError: any) {
      if (authError.code === "auth/email-already-exists") {
        return res.status(400).json({ success: false, error: "Username already taken" });
      }
      throw authError;
    }

    await db.runTransaction(async (transaction) => {
      let inviterUserId: string | null = null;

      if (!isMasterCode) {
        const inviteCodeRef = db.collection("inviteCodes").doc(normalizedCode);
        const inviteCodeDoc = await transaction.get(inviteCodeRef);

        if (!inviteCodeDoc.exists) {
          throw new Error("INVALID_INVITE_CODE");
        }

        const inviteData = inviteCodeDoc.data();
        if (inviteData?.used) {
          throw new Error("INVITE_CODE_ALREADY_USED");
        }

        inviterUserId = inviteData?.createdBy || null;

        transaction.update(inviteCodeRef, {
          used: true,
          usedBy: username,
          usedAt: Date.now(),
        });
      }

      const userRef = db.collection("users").doc(userRecord.uid);
      transaction.set(userRef, {
        username,
        email,
        avatar: generateAvatar(username),
        level: 1,
        xp: 0,
        totalPullups: 0,
        totalPushups: 0,
        totalDips: 0,
        totalRunningKm: 0,
        invitedBy: isMasterCode ? "master" : inviterUserId,
        createdAt: Date.now(),
      });
    });

    const customToken = await auth.createCustomToken(userRecord.uid);

    return res.json({
      success: true,
      customToken,
      userId: userRecord.uid,
    });
  } catch (error: any) {
    console.error("Signup error:", error);

    if (createdUserId) {
      try {
        const { auth } = getAdminInstances();
        await auth.deleteUser(createdUserId);
      } catch (cleanupError) {
        console.error("Failed to cleanup auth user:", cleanupError);
      }
    }

    if (error.message === "INVALID_INVITE_CODE") {
      return res.status(400).json({ success: false, error: "Invalid invite code" });
    }
    if (error.message === "INVITE_CODE_ALREADY_USED") {
      return res.status(400).json({ success: false, error: "Invite code already used" });
    }

    return res.status(500).json({ success: false, error: error.message || "Signup failed" });
  }
}
