import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, verifyAuthToken, verifyTokenFromBody, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { setCorsHeaders } from "./lib/cors.js";
import { rateLimit, RateLimits } from "./lib/rate-limit.js";

function generateAvatar(username: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return; // Preflight handled
  }

  const envError = verifyRequiredEnvVars();
  if (envError) {
    return res.status(503).json({ success: false, error: "Server not fully configured" });
  }

  initializeFirebaseAdmin();

  if (req.method === "GET") {
    return handleGetUsers(req, res);
  } else if (req.method === "POST") {
    // Handle invite code validation
    if (req.body?.validate === 'inviteCode' || req.query.validate === 'inviteCode') {
      return handleInviteCodeValidation(req, res);
    }
    return handleSignup(req, res);
  } else if (req.method === "PUT") {
    return handleUpdateUser(req, res);
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGetUsers(req: VercelRequest, res: VercelResponse) {
  // Handle validation requests (username availability check)
  if (req.query.validate === 'username') {
    // Rate limit to prevent enumeration attacks
    if (rateLimit(req, res, RateLimits.READ)) {
      return; // Rate limit exceeded
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

  // Regular user list request
  try {
    const user = await verifyAuthToken(req.headers.authorization as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { db } = getAdminInstances();
    const usersSnapshot = await db.collection("users").orderBy("username").limit(100).get();

    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data.username,
        avatar: data.avatar,
        level: data.level,
      };
    });

    return res.json({ success: true, users });
  } catch (error: any) {
    console.error("Get users error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get users" });
  }
}

async function handleInviteCodeValidation(req: VercelRequest, res: VercelResponse) {
  // Rate limit to prevent enumeration attacks
  if (rateLimit(req, res, RateLimits.READ)) {
    return; // Rate limit exceeded
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

async function handleSignup(req: VercelRequest, res: VercelResponse) {
  // Rate limit: 5 requests per 15 minutes
  if (rateLimit(req, res, RateLimits.AUTH)) {
    return; // Rate limit exceeded
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

  if (password.length < 7) {
    return res.status(400).json({ success: false, error: "Password must be at least 7 characters" });
  }

  const isMasterCode = normalizedCode === masterCode?.trim().toUpperCase();

  let createdUserId: string | null = null;

  try {
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
        followerCount: 0,
        followingCount: 0,
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

async function handleUpdateUser(req: VercelRequest, res: VercelResponse) {
  const { idToken, avatar, username, milestones } = req.body;

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
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const updateData: Record<string, any> = {};

    if (avatar !== undefined) {
      // Validate avatar size (data URLs can be huge)
      const MAX_AVATAR_SIZE = 200 * 1024; // 200KB limit
      if (avatar && avatar.length > MAX_AVATAR_SIZE) {
        return res.status(400).json({
          success: false,
          error: "Avatar image too large. Please use an image under 200KB.",
        });
      }

      // Basic validation for data URL format
      if (avatar && avatar.startsWith('data:')) {
        if (!avatar.startsWith('data:image/')) {
          return res.status(400).json({
            success: false,
            error: "Avatar must be an image",
          });
        }
      }

      updateData.avatar = avatar;
    }

    const userData = userDoc.data();
    const oldUsername = userData?.username;

    if (username !== undefined) {
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ success: false, error: "Username must be 3-20 characters" });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ success: false, error: "Username can only contain letters, numbers, and underscores" });
      }

      const existingUser = await db.collection("users")
        .where("username", "==", username)
        .get();

      if (!existingUser.empty && existingUser.docs[0].id !== userId) {
        return res.status(400).json({ success: false, error: "Username already taken" });
      }

      updateData.username = username;
    }

    if (milestones !== undefined) {
      // Validate milestones array
      if (!Array.isArray(milestones)) {
        return res.status(400).json({ success: false, error: "Milestones must be an array" });
      }

      // Limit to 20 milestones
      if (milestones.length > 20) {
        return res.status(400).json({ success: false, error: "Maximum 20 milestones allowed" });
      }

      // Validate each milestone
      for (const milestone of milestones) {
        if (!milestone.id || !milestone.name || !milestone.target) {
          return res.status(400).json({ success: false, error: "Invalid milestone format" });
        }
        if (milestone.name.length > 100) {
          return res.status(400).json({ success: false, error: "Milestone name too long" });
        }
        if (typeof milestone.target !== 'number' || milestone.target <= 0) {
          return res.status(400).json({ success: false, error: "Milestone target must be a positive number" });
        }
      }

      updateData.milestones = milestones;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    updateData.updatedAt = Date.now();

    await userRef.update(updateData);

    // If username was updated, update it in all challenges where this user participates
    if (username !== undefined && username !== oldUsername) {
      try {
        const challengesSnapshot = await db.collection("challenges")
          .where("participantIds", "array-contains", userId)
          .get();

        const batch = db.batch();
        for (const challengeDoc of challengesSnapshot.docs) {
          const challengeData = challengeDoc.data();
          const participants = challengeData.participants || [];

          const updatedParticipants = participants.map((p: any) => {
            if (p.userId === userId) {
              return { ...p, username: username };
            }
            return p;
          });

          batch.update(challengeDoc.ref, { participants: updatedParticipants });
        }

        await batch.commit();
      } catch (challengeError) {
        console.error("Failed to update username in challenges:", challengeError);
        // Don't fail the request if challenge updates fail
      }
    }

    return res.json({ success: true, updated: updateData });
  } catch (error: any) {
    console.error("Update user error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to update user" });
  }
}
