import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getApiUrl } from "./api";

let firebaseInitialized = false;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let appInstance: FirebaseApp | null = null;

export async function initializeFirebase() {
  if (firebaseInitialized) {
    return { app: appInstance, auth: authInstance, db: dbInstance };
  }

  try {
    let firebaseConfig = null;

    // Try to fetch config from API (when online)
    try {
      const response = await fetch(getApiUrl("/api/config"));
      if (response.ok) {
        const data = await response.json();
        if (!data.error && data.firebase) {
          firebaseConfig = data.firebase;
          // Cache config for offline use
          localStorage.setItem("firebase_config", JSON.stringify(firebaseConfig));
        }
      }
    } catch (fetchError) {
      console.warn("Could not fetch config from API, attempting to use cached config:", fetchError);
    }

    // If API fetch failed, try cached config
    if (!firebaseConfig) {
      const cachedConfig = localStorage.getItem("firebase_config");
      if (cachedConfig) {
        firebaseConfig = JSON.parse(cachedConfig);
        console.log("Using cached Firebase config for offline mode");
      } else {
        throw new Error("No Firebase configuration available (offline and no cache)");
      }
    }

    appInstance = initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);

    // Enable auth persistence
    await setPersistence(authInstance, browserLocalPersistence).catch((error) => {
      console.warn("Auth persistence setup warning:", error);
    });

    // Enable Firestore offline persistence
    await enableIndexedDbPersistence(dbInstance).catch((error) => {
      if (error.code === 'failed-precondition') {
        console.warn("Firestore persistence failed: Multiple tabs open");
      } else if (error.code === 'unimplemented') {
        console.warn("Firestore persistence not supported in this browser");
      } else {
        console.warn("Firestore persistence setup warning:", error);
      }
    });

    firebaseInitialized = true;
    return { app: appInstance, auth: authInstance, db: dbInstance };
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    throw error;
  }
}

export function getFirebaseInstances() {
  return { auth: authInstance, db: dbInstance, app: appInstance };
}
