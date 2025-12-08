import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getApiUrl } from "./api";

let firebaseInitialized = false;
let authInstance: any = null;
let dbInstance: any = null;
let appInstance: any = null;

export async function initializeFirebase() {
  if (firebaseInitialized) {
    return { app: appInstance, auth: authInstance, db: dbInstance };
  }

  try {
    const response = await fetch(getApiUrl("/api/config"));
    if (!response.ok) {
      throw new Error("Failed to load configuration");
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.details || data.error);
    }
    const firebaseConfig = data.firebase;

    appInstance = initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);

    await setPersistence(authInstance, browserLocalPersistence).catch((error) => {
      console.warn("Persistence setup warning:", error);
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
