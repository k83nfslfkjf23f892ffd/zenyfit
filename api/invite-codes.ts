import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminInstances, verifyRequiredEnvVars, verifyTokenFromBody, initializeFirebaseAdmin } from "./lib/firebase-admin.js";
import { setCorsHeaders } from "./lib/cors.js";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
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
    return handleGetInviteCodes(req, res);
  } else if (req.method === "POST") {
    return handleCreateInviteCode(req, res);
  } else if (req.method === "DELETE") {
    return handleDeleteInviteCode(req, res);
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGetInviteCodes(req: VercelRequest, res: VercelResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    const { auth, db } = getAdminInstances();
    
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const inviteCodesSnapshot = await db.collection("inviteCodes")
      .where("createdBy", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const inviteCodes = inviteCodesSnapshot.docs.map(doc => ({
      id: doc.id,
      code: doc.id,
      createdAt: doc.data().createdAt,
      used: doc.data().used || false,
      usedBy: doc.data().usedBy || null,
      usedAt: doc.data().usedAt || null,
    }));

    return res.json({ success: true, inviteCodes });
  } catch (error: any) {
    console.error("Get invite codes error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to get invite codes" });
  }
}

async function handleCreateInviteCode(req: VercelRequest, res: VercelResponse) {
  const { idToken } = req.body;

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

    const existingCodesSnapshot = await db.collection("inviteCodes")
      .where("createdBy", "==", userId)
      .get();

    if (existingCodesSnapshot.size >= 10) {
      return res.status(400).json({ 
        success: false, 
        error: "Maximum invite codes reached. You can only have 10 codes." 
      });
    }

    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const existingDoc = await db.collection("inviteCodes").doc(code).get();
      if (!existingDoc.exists) {
        break;
      }
      code = generateCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({ success: false, error: "Failed to generate unique code. Please try again." });
    }

    await db.collection("inviteCodes").doc(code).set({
      createdBy: userId,
      createdAt: Date.now(),
      used: false,
    });

    return res.json({ 
      success: true, 
      inviteCode: {
        id: code,
        code: code,
        createdAt: Date.now(),
        used: false,
      }
    });
  } catch (error: any) {
    console.error("Create invite code error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to create invite code" });
  }
}

async function handleDeleteInviteCode(req: VercelRequest, res: VercelResponse) {
  const { idToken, code } = req.body;

  if (!idToken || !code) {
    return res.status(400).json({ success: false, error: "Missing token or code" });
  }

  try {
    const user = await verifyTokenFromBody(idToken);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { db } = getAdminInstances();
    const userId = user.userId;

    const inviteCodeRef = db.collection("inviteCodes").doc(code);
    const inviteCodeDoc = await inviteCodeRef.get();

    if (!inviteCodeDoc.exists) {
      return res.status(404).json({ success: false, error: "Invite code not found" });
    }

    const data = inviteCodeDoc.data();
    if (data?.createdBy !== userId) {
      return res.status(403).json({ success: false, error: "Not authorized to delete this code" });
    }

    await inviteCodeRef.delete();

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Delete invite code error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to delete invite code" });
  }
}
