import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, verifyAuthToken, verifyTokenFromBody, initializeFirebaseAdmin } from "../lib/firebase-admin.js";
import { calculateWorkoutXP, calculateLevel } from "../shared/constants.js";
import { setCorsHeaders } from "../lib/cors.js";
import { rateLimit, RateLimits } from "../lib/rate-limit.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return; // Preflight handled
  }

  // Rate limit write operations
  if (req.method === "POST" || req.method === "DELETE") {
    if (await rateLimit(req, res, RateLimits.WRITE)) {
      return; // Rate limit exceeded
    }
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

    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page
    const offset = parseInt(req.query.offset as string) || 0;

    let query = db.collection("exercise_logs")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc");

    // Apply offset if provided
    if (offset > 0) {
      const offsetSnapshot = await query.limit(offset).get();
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    const logsSnapshot = await query.limit(limit).get();

    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Check if there are more logs
    const hasMore = logsSnapshot.docs.length === limit;

    return res.json({
      success: true,
      logs,
      hasMore,
      offset: offset + logs.length,
    });
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

  // Sanitize and validate exercise type
  const sanitizedExerciseType = String(exerciseType).trim().toLowerCase();

  if (sanitizedExerciseType.length === 0 || sanitizedExerciseType.length > 50) {
    return res.status(400).json({
      success: false,
      error: "Exercise type must be between 1 and 50 characters"
    });
  }

  // Validate exercise type contains only safe characters
  if (!/^[a-z0-9\s\-_]+$/.test(sanitizedExerciseType)) {
    return res.status(400).json({
      success: false,
      error: "Exercise type contains invalid characters"
    });
  }

  // Validate amount is reasonable
  if (amount > 100000) {
    return res.status(400).json({
      success: false,
      error: "Amount seems unreasonably large"
    });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const xpGained = calculateWorkoutXP(sanitizedExerciseType, amount);

    const timestamp = Date.now();
    const logEntry = {
      userId,
      exerciseType: sanitizedExerciseType,
      amount,
      unit: unit || "reps",
      isCustom: isCustom || false,
      xpGained,
      timestamp,
      createdAt: new Date().toISOString(),
    };

    // Write to exercise_logs collection
    const logRef = db.collection("exercise_logs").doc();
    await logRef.set(logEntry);

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
      if (sanitizedExerciseType === "pull-up") {
        updateData.totalPullups = (userData.totalPullups || 0) + amount;
      } else if (sanitizedExerciseType === "push-up") {
        updateData.totalPushups = (userData.totalPushups || 0) + amount;
      } else if (sanitizedExerciseType === "dip") {
        updateData.totalDips = (userData.totalDips || 0) + amount;
      } else if (sanitizedExerciseType === "run") {
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
          .where("type", "==", sanitizedExerciseType)
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

    // Revert challenge progress if not a custom exercise
    if (!logData.isCustom) {
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

            // Only update if the workout was logged during the challenge period
            if (logData.timestamp >= challengeData.startDate && logData.timestamp <= challengeData.endDate) {
              const participants = challengeData.participants || [];
              const updatedParticipants = participants.map((p: any) => {
                if (p.userId === userId) {
                  return {
                    ...p,
                    progress: Math.max(0, (p.progress || 0) - amount),
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
        console.error("Failed to revert challenge progress:", challengeError);
      }
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
