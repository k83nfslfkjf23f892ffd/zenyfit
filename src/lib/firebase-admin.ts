import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

/**
 * Initialize Firebase Admin SDK (singleton pattern)
 * Returns instances of app, db, and auth
 */
export function getAdminInstances() {
  if (!adminApp) {
    // Check if already initialized by another instance
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
    } else {
      // Parse service account key from environment variable
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
      }

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountKey);
      } catch {
        throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON');
      }

      // Initialize Firebase Admin
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    // Initialize Firestore and Auth
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);

    // Configure Firestore settings
    adminDb.settings({
      ignoreUndefinedProperties: true,
    });
  }

  return {
    app: adminApp!,
    db: adminDb!,
    auth: adminAuth!,
  };
}

/**
 * Verify Firebase Auth ID token from Authorization header
 * Returns decoded token with user info or null if invalid
 */
export async function verifyAuthToken(authHeader: string | null | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    return null;
  }

  try {
    const { auth } = getAdminInstances();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}
