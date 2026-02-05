import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let firebaseInitialized = false;

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Initialize Firebase Client SDK (singleton pattern)
 * Fetches config from /api/config endpoint to keep secrets server-side
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
    // Fetch Firebase config from API endpoint
    const response = await fetch('/api/config');
    if (!response.ok) {
      throw new Error('Failed to fetch Firebase config');
    }
    const config: FirebaseConfig = await response.json();

    // Check if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
    } else {
      // Initialize Firebase
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

    // Set persistence AFTER emulator connection
    await setPersistence(firebaseAuth, browserLocalPersistence);

    // Enable offline persistence (wrapped in try-catch as it can fail in some environments)
    try {
      await enableIndexedDbPersistence(firebaseDb);
    } catch (err: unknown) {
      const firestoreError = err as { code?: string };
      if (firestoreError.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.warn('Firestore persistence failed: Multiple tabs open');
      } else if (firestoreError.code === 'unimplemented') {
        // The current browser doesn't support persistence
        console.warn('Firestore persistence not supported in this browser');
      }
    }

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
