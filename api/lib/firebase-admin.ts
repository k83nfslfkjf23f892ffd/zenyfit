import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;
let adminDb: admin.firestore.Firestore | null = null;
let adminAuth: admin.auth.Auth | null = null;

export function initializeFirebaseAdmin() {
  if (adminApp) {
    return { app: adminApp, db: adminDb!, auth: adminAuth! };
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccount) {
    const parsedServiceAccount = JSON.parse(serviceAccount);
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(parsedServiceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
    adminApp = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  adminDb = admin.firestore();
  adminAuth = admin.auth();

  return { app: adminApp, db: adminDb, auth: adminAuth };
}

export function getAdminInstances() {
  if (!adminApp) {
    return initializeFirebaseAdmin();
  }
  return { app: adminApp, db: adminDb!, auth: adminAuth! };
}

export function verifyRequiredEnvVars(): string | null {
  const required = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_SERVICE_ACCOUNT_KEY",
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    return `Missing environment variables: ${missing.join(", ")}`;
  }
  return null;
}

export function verifyClientEnvVars(): string | null {
  const required = [
    "FIREBASE_API_KEY",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_PROJECT_ID",
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    return `Missing environment variables: ${missing.join(", ")}`;
  }
  return null;
}

export async function verifyAuthToken(authHeader: string | undefined): Promise<{ userId: string; email?: string } | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.split("Bearer ")[1];
  
  try {
    const { auth } = getAdminInstances();
    const decodedToken = await auth.verifyIdToken(idToken);
    return { userId: decodedToken.uid, email: decodedToken.email };
  } catch {
    return null;
  }
}

export async function verifyTokenFromBody(idToken: string): Promise<{ userId: string; email?: string } | null> {
  if (!idToken) return null;

  try {
    const { auth } = getAdminInstances();
    const decodedToken = await auth.verifyIdToken(idToken);
    return { userId: decodedToken.uid, email: decodedToken.email };
  } catch {
    return null;
  }
}
