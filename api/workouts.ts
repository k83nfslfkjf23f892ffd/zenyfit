import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, verifyAuthToken, verifyTokenFromBody, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { FieldValue } from "firebase-admin/firestore";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigins = ["http://localhost:5000", process.env.APP_URL].filter(Boolean);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
    return handleGetWorkoutLogs(req, res);
  } else if (req.method === "POST") {
    return handleLogWorkout(req, res);
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGetWorkoutLogs(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await verifyAuthToken(req.headers.authorization as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const logsSnapshot = await db.collection("exercise_logs")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ success: true, logs });
  } catch (error: any) {
    console.error("Get workout logs error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get logs" });
  }
}

async function handleLogWorkout(req: VercelRequest, res: VercelResponse) {
  const { exerciseType, amount, unit, isCustom } = req.body;

  if (!exerciseType || amount === undefined || amount <= 0) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const user = await verifyAuthToken(req.headers.authorization as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const xpRates: Record<string, number> = {
      "pull-up": 15,
      "push-up": 3,
      "dip": 10,
      "run": 50,
    };

    const xpGained = isCustom ? Math.floor(amount * 5) : Math.floor(amount * (xpRates[exerciseType] || 5));

    const logEntry = {
      userId,
      exerciseType,
      amount,
      unit: unit || "reps",
      isCustom: isCustom || false,
      xpGained,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
    };

    const logRef = await db.collection("exercise_logs").add(logEntry);
    const userRef = db.collection("users").doc(userId);

    // Use a transaction to atomically update user stats
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error("User not found");
      }

      const updateData: Record<string, any> = {
        xp: FieldValue.increment(xpGained),
      };

      if (!isCustom) {
        if (exerciseType === "pull-up") {
          updateData.totalPullups = FieldValue.increment(amount);
        } else if (exerciseType === "push-up") {
          updateData.totalPushups = FieldValue.increment(amount);
        } else if (exerciseType === "dip") {
          updateData.totalDips = FieldValue.increment(amount);
        } else if (exerciseType === "run") {
          updateData.totalRunningKm = FieldValue.increment(amount);
        }
      }
      transaction.update(userRef, updateData);
    });

    // After the transaction, get the latest user data to calculate level
    const updatedUserDoc = await userRef.get();
    const userData = updatedUserDoc.data() || {};
    const currentXP = userData.xp || 0;
    const oldLevel = userData.level || 1;

    const levelThresholds = [0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000, 30000];
    let newLevel = 1;
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (currentXP >= levelThresholds[i]) {
        if (i >= levelThresholds.length - 1) {
          const extraXP = currentXP - levelThresholds[levelThresholds.length - 1];
          newLevel = levelThresholds.length + Math.floor(extraXP / 7000);
        } else {
          newLevel = i + 1;
        }
        break;
      }
    }

    // Only update the level if it has changed
    if (newLevel > oldLevel) {
      await userRef.update({ level: newLevel });
    }

    const leveledUp = newLevel > oldLevel;

    if (!isCustom) {
      try {
        const now = Date.now();
        const challengesSnapshot = await db.collection("challenges")
          .where("participantIds", "array-contains", userId)
          .where("type", "==", exerciseType)
          .get();

        for (const challengeDoc of challengesSnapshot.docs) {
          await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(challengeDoc.ref);
            if (!freshDoc.exists) return;

            const challengeData = freshDoc.data()!;

            if (now >= challengeData.startDate && now <= challengeData.endDate) {
              const participants = challengeData.participants || [];
              const updatedParticipants = participants.map((p: any) => {
                if (p.userId === userId) {
                  return {
                    ...p,
                    progress: (p.progress || 0) + amount,
                  };
                }
                return p;
              });

              transaction.update(challengeDoc.ref, {
                participants: updatedParticipants,
              });
            }
          });
        }
      } catch (challengeError) {
        console.error("Failed to update challenge progress:", challengeError);
      }
    }

    return res.json({
      success: true,
      logId: logRef.id,
      xpGained,
      newXP: currentXP,
      newLevel,
      leveledUp,
    });
  } catch (error: any) {
    console.error("Log workout error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to log workout" });
  }
}

