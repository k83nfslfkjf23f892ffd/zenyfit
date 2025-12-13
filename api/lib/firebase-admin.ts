import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;
let adminDb: admin.firestore.Firestore | null = null;
let adminAuth: admin.auth.Auth | null = null;

export function initializeFirebaseAdmin() {
  if (adminApp) {
    return { app: adminApp, db: adminDb!, auth: adminAuth! };
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required");
  }

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID environment variable is required");
  }

  try {
    const parsedServiceAccount = JSON.parse(serviceAccount);

    // Validate that the service account has required fields
    if (!parsedServiceAccount.project_id || !parsedServiceAccount.private_key || !parsedServiceAccount.client_email) {
      throw new Error("Invalid service account key: missing required fields");
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(parsedServiceAccount),
      projectId: projectId,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON");
    }
    throw error;
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
    "FIREBASE_STORAGE_BUCKET",
    "FIREBASE_MESSAGING_SENDER_ID",
    "FIREBASE_APP_ID",
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
