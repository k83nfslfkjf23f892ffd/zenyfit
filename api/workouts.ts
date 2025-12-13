import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, verifyAuthToken, verifyTokenFromBody, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { calculateWorkoutXP, calculateLevel } from "../shared/constants.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
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
  } else if (req.method === "DELETE") {
    return handleDeleteWorkout(req, res);
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
  const { idToken, exerciseType, amount, unit, isCustom } = req.body;

  if (!idToken || !exerciseType || amount === undefined || amount <= 0) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const xpGained = calculateWorkoutXP(exerciseType, amount);

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
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const userData = userDoc.data() || {};
    const currentXP = userData.xp || 0;
    const newXP = currentXP + xpGained;

    const newLevel = calculateLevel(newXP);

    const updateData: Record<string, any> = {
      xp: newXP,
      level: newLevel,
    };

    if (!isCustom) {
      if (exerciseType === "pull-up") {
        updateData.totalPullups = (userData.totalPullups || 0) + amount;
      } else if (exerciseType === "push-up") {
        updateData.totalPushups = (userData.totalPushups || 0) + amount;
      } else if (exerciseType === "dip") {
        updateData.totalDips = (userData.totalDips || 0) + amount;
      } else if (exerciseType === "run") {
        updateData.totalRunningKm = (userData.totalRunningKm || 0) + amount;
      }
    }

    await userRef.update(updateData);

    const leveledUp = newLevel > (userData.level || 1);

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
      newXP,
      newLevel,
      leveledUp,
    });
  } catch (error: any) {
    console.error("Log workout error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to log workout" });
  }
}

async function handleDeleteWorkout(req: VercelRequest, res: VercelResponse) {
  const { idToken, logId } = req.body;

  if (!idToken || !logId) {
    return res.status(400).json({ success: false, error: "Missing logId or token" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    // Get the workout log
    const logRef = db.collection("exercise_logs").doc(logId);
    const logDoc = await logRef.get();

    if (!logDoc.exists) {
      return res.status(404).json({ success: false, error: "Workout log not found" });
    }

    const logData = logDoc.data();

    // Verify the user owns this log
    if (logData?.userId !== userId) {
      return res.status(403).json({ success: false, error: "Not authorized to delete this log" });
    }

    // Get user data
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const userData = userDoc.data() || {};
    const xpLost = logData.xpGained || 0;
    const currentXP = userData.xp || 0;
    const newXP = Math.max(0, currentXP - xpLost); // Don't go below 0
    const newLevel = calculateLevel(newXP);

    // Update user data
    const updateData: Record<string, any> = {
      xp: newXP,
      level: newLevel,
    };

    // Revert exercise totals
    const exerciseType = logData.exerciseType;
    const amount = logData.amount || 0;

    if (exerciseType === "pull-up") {
      updateData.totalPullups = Math.max(0, (userData.totalPullups || 0) - amount);
    } else if (exerciseType === "push-up") {
      updateData.totalPushups = Math.max(0, (userData.totalPushups || 0) - amount);
    } else if (exerciseType === "dip") {
      updateData.totalDips = Math.max(0, (userData.totalDips || 0) - amount);
    } else if (exerciseType === "run") {
      updateData.totalRunningKm = Math.max(0, (userData.totalRunningKm || 0) - amount);
    }

    // Delete the log and update user in a batch
    const batch = db.batch();
    batch.delete(logRef);
    batch.update(userRef, updateData);
    await batch.commit();

    return res.json({
      success: true,
      xpLost,
      newXP,
      newLevel,
    });
  } catch (error: any) {
    console.error("Delete workout error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to delete workout" });
  }
}
