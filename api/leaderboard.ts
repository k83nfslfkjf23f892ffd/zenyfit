import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, initializeFirebaseAdmin } from "../lib/firebase-admin.js";
import { setCorsHeaders } from "../lib/cors.js";

function getDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayName(timestamp: number): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayNames[new Date(timestamp).getDay()];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return; // Preflight handled
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const envError = verifyRequiredEnvVars();
  if (envError) {
    return res.status(503).json({ success: false, error: "Server not fully configured" });
  }

  initializeFirebaseAdmin();

  const { action = "rankings" } = req.query;

  if (action === "trend") {
    return handleTrend(req, res);
  }

  return handleRankings(req, res);
}

async function handleRankings(req: VercelRequest, res: VercelResponse) {
  try {
    const { db } = getAdminInstances();
    const {
      type = "all",
      limit: limitParam = "20",
      offset: offsetParam = "0"
    } = req.query;

    const limitNum = Math.min(parseInt(limitParam as string) || 20, 100);
    const offsetNum = Math.max(parseInt(offsetParam as string) || 0, 0);

    let orderField = "xp";
    if (type === "pull-up") orderField = "totalPullups";
    else if (type === "push-up") orderField = "totalPushups";
    else if (type === "dip") orderField = "totalDips";
    else if (type === "run") orderField = "totalRunningKm";

    // Get users with offset support
    const usersSnapshot = await db.collection("users")
      .orderBy(orderField, "desc")
      .offset(offsetNum)
      .limit(limitNum)
      .get();

    // Check if there are more results
    const hasMore = usersSnapshot.docs.length === limitNum;

    const rankings = usersSnapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        rank: offsetNum + index + 1, // Adjust rank based on offset
        userId: doc.id,
        username: data.username,
        avatar: data.avatar,
        score: type === "all" ? data.xp : data[orderField],
        level: data.level,
        xp: data.xp,
      };
    });

    return res.json({ success: true, rankings, hasMore });
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get leaderboard" });
  }
}

async function handleTrend(req: VercelRequest, res: VercelResponse) {
  try {
    const { db } = getAdminInstances();

    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    const last7Dates: { dateKey: string; dayName: string; timestamp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7Dates.push({
        dateKey: getDateKey(d.getTime()),
        dayName: getDayName(d.getTime()),
        timestamp: d.getTime(),
      });
    }

    const topUsersSnapshot = await db.collection("users")
      .orderBy("xp", "desc")
      .limit(10)
      .get();

    const topUserIds = topUsersSnapshot.docs.map(doc => doc.id);
    const topUserCount = topUserIds.length;

    const dateTotals: Record<string, number> = {};
    last7Dates.forEach(d => dateTotals[d.dateKey] = 0);

    if (topUserIds.length > 0) {
      // Query exercise_logs for top users (more consistent than subcollections)
      const logsSnapshot = await db.collection("exercise_logs")
        .where("timestamp", ">=", sevenDaysAgo)
        .get();

      // Filter to only top users' logs and aggregate
      logsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const userId = data.userId;

        // Only count logs from top users
        if (topUserIds.includes(userId)) {
          const dateKey = getDateKey(data.timestamp);
          if (dateTotals.hasOwnProperty(dateKey)) {
            dateTotals[dateKey] += data.amount || 0;
          }
        }
      });
    }

    const result = last7Dates.map(d => ({
      date: d.dayName,
      topAvg: topUserCount > 0 ? Math.round(dateTotals[d.dateKey] / topUserCount) : 0,
    }));

    return res.json({ success: true, trendData: result });
  } catch (error: any) {
    console.error("Leaderboard trend error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get trend data" });
  }
}
