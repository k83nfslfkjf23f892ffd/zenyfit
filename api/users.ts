import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, verifyAuthToken, verifyTokenFromBody, initializeFirebaseAdmin } from "./lib/firebase-admin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const envError = verifyRequiredEnvVars();
  if (envError) {
    return res.status(503).json({ success: false, error: "Server not fully configured" });
  }

  initializeFirebaseAdmin();

  if (req.method === "GET") {
    return handleGetUsers(req, res);
  } else if (req.method === "PUT") {
    return handleUpdateUser(req, res);
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGetUsers(req: VercelRequest, res: VercelResponse) {
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

async function handleUpdateUser(req: VercelRequest, res: VercelResponse) {
  const { idToken, avatar, username } = req.body;

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
