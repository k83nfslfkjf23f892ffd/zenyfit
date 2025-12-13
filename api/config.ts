import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyClientEnvVars } from "./lib/firebase-admin.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (_req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const envError = verifyClientEnvVars();
  if (envError) {
    return res.status(503).json({ error: "Server not configured", details: envError });
  }

  const config = {
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    },
  };

  return res.json(config);
}
