import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { setCorsHeaders } from "./lib/cors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCorsHeaders(req, res)) {
    return; // Preflight handled
  }

  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", error: "Method not allowed" });
  }

  const startTime = Date.now();

  try {
    // Check environment variables
    const envError = verifyRequiredEnvVars();
    if (envError) {
      return res.status(503).json({
        status: "error",
        error: "Environment not configured",
        timestamp: new Date().toISOString(),
      });
    }

    // Initialize and check Firebase connection
    initializeFirebaseAdmin();
    const { db } = getAdminInstances();

    // Test database connectivity with a simple query
    await db.collection("users").limit(1).get();

    const responseTime = Date.now() - startTime;

    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV || "production",
      version: "1.0.0",
      checks: {
        database: "connected",
        environment: "configured",
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("Health check failed:", error);

    return res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
