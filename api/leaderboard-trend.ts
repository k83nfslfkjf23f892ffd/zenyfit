import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, initializeFirebaseAdmin } from "./lib/firebase-admin.js";

function getDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayName(timestamp: number): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayNames[new Date(timestamp).getDay()];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const envError = verifyRequiredEnvVars();
  if (envError) {
    return res.status(503).json({ success: false, error: "Server not fully configured" });
  }

  try {
    initializeFirebaseAdmin();
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
      for (const userId of topUserIds) {
        const workoutsSnapshot = await db.collection("users")
          .doc(userId)
          .collection("workouts")
          .where("timestamp", ">=", sevenDaysAgo)
          .get();
        
        workoutsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const dateKey = getDateKey(data.timestamp);
          if (dateTotals.hasOwnProperty(dateKey)) {
            dateTotals[dateKey] += data.amount || 0;
          }
        });
      }
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
