import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let firebaseInitialized = false;

/**
 * Initialize Firebase Client SDK (singleton pattern)
 * Config is inlined at build time via env vars — no network fetch needed
 */
export async function initializeFirebase() {
  if (firebaseInitialized) {
    return {
      app: firebaseApp!,
      auth: firebaseAuth!,
      db: firebaseDb!,
    };
  }

  try {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Check if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
    } else {
      firebaseApp = initializeApp(config);
    }

    // Initialize Auth
    firebaseAuth = getAuth(firebaseApp);

    // Initialize Firestore
    firebaseDb = getFirestore(firebaseApp);

    // Connect to emulators BEFORE setting persistence (must happen before auth state restoration)
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      // Use the same host the page is served from (works for both localhost and network IP)
      const emulatorHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      console.log(`🔧 Connecting to Firebase Emulators at ${emulatorHost}...`);
      try {
        // Use port 9199 (proxy) when accessing from network, 9099 when on localhost
        const authPort = emulatorHost === 'localhost' || emulatorHost === '127.0.0.1' ? 9099 : 9199;
        connectAuthEmulator(firebaseAuth, `http://${emulatorHost}:${authPort}`, { disableWarnings: true });
        console.log(`✅ Auth emulator connected on port ${authPort}`);
      } catch (e) {
        console.error('❌ Auth emulator connection failed:', e);
      }
      try {
        connectFirestoreEmulator(firebaseDb, emulatorHost, 8080);
        console.log('✅ Firestore emulator connected');
      } catch (e) {
        console.error('❌ Firestore emulator connection failed:', e);
      }
    }

    // Set persistence and enable offline support in parallel
    await Promise.all([
      setPersistence(firebaseAuth, browserLocalPersistence),
      enableIndexedDbPersistence(firebaseDb).catch((err: unknown) => {
        const firestoreError = err as { code?: string };
        if (firestoreError.code === 'failed-precondition') {
          console.warn('Firestore persistence failed: Multiple tabs open');
        } else if (firestoreError.code === 'unimplemented') {
          console.warn('Firestore persistence not supported in this browser');
        }
      }),
    ]);

    firebaseInitialized = true;

    return {
      app: firebaseApp,
      auth: firebaseAuth,
      db: firebaseDb,
    };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

/**
 * Get Firebase instances (must call initializeFirebase first)
 */
export function getFirebaseInstances() {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }

  return {
    app: firebaseApp!,
    auth: firebaseAuth!,
    db: firebaseDb!,
  };
}
