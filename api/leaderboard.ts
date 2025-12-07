import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, initializeFirebaseAdmin } from "./lib/firebase-admin.js";

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
    const { type = "all", limit: limitParam = "20" } = req.query;
    const limitNum = Math.min(parseInt(limitParam as string) || 20, 100);

    let orderField = "xp";
    if (type === "pull-up") orderField = "totalPullups";
    else if (type === "push-up") orderField = "totalPushups";
    else if (type === "dip") orderField = "totalDips";
    else if (type === "run") orderField = "totalRunningKm";

    const usersSnapshot = await db.collection("users")
      .orderBy(orderField, "desc")
      .limit(limitNum)
      .get();

    const rankings = usersSnapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        rank: index + 1,
        userId: doc.id,
        username: data.username,
        avatar: data.avatar,
        score: type === "all" ? data.xp : data[orderField],
        level: data.level,
        xp: data.xp,
      };
    });

    return res.json({ success: true, rankings });
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get leaderboard" });
  }
}
