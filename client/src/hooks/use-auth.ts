import { useState, useEffect } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { initializeFirebase, getFirebaseInstances } from "@/lib/firebase";
import {
  XP_RATES,
  LEVEL_THRESHOLDS,
  calculateLevel,
  getXPForNextLevel,
} from "@shared/constants";

export interface InviteCode {
  code: string;
  createdBy: string;
  used: boolean;
  usedBy: string | null;
  createdAt: number;
  usedAt?: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  level: number;
  xp: number;
  totalPullups: number;
  totalPushups: number;
  totalDips: number;
  totalRunningKm: number;
  invitedBy: string;
  createdAt: number;
}

// Re-export for convenience
export { XP_RATES, LEVEL_THRESHOLDS, calculateLevel, getXPForNextLevel };

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeProfile: (() => void) | null = null;

    const setupAuth = async () => {
      try {
        await initializeFirebase();
        const { auth, db } = getFirebaseInstances();

        if (!auth) {
          setLoading(false);
          return;
        }

        unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
          setUser(firebaseUser);

          if (firebaseUser && db) {
            const userDocRef = doc(db, "users", firebaseUser.uid);

            unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
              if (docSnap.exists()) {
                const profile = {
                  id: docSnap.id,
                  ...docSnap.data(),
                } as UserProfile;
                setUserProfile(profile);
                // Cache profile for offline use
                localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(profile));
              } else {
                setUserProfile(null);
              }
              setLoading(false);
            }, (err) => {
              console.error("Error fetching user profile:", err);

              // Try to use cached profile when offline
              const cachedProfile = localStorage.getItem(`user_profile_${firebaseUser.uid}`);
              if (cachedProfile) {
                console.log("Using cached user profile for offline mode");
                setUserProfile(JSON.parse(cachedProfile));
                setLoading(false);
              } else {
                setError("Failed to load user profile");
                setLoading(false);
              }
            });
          } else {
            setUserProfile(null);
            setLoading(false);
          }
        });
      } catch (err) {
        console.error("Auth setup error:", err);
        setError("Failed to initialize authentication");
        setLoading(false);
      }
    };

    setupAuth();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const logout = async () => {
    try {
      const { auth } = getFirebaseInstances();
      if (auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.error("Logout error:", err);
      throw err;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { db } = getFirebaseInstances();
      if (!db) return;
      
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        setUserProfile({
          id: docSnap.id,
          ...docSnap.data(),
        } as UserProfile);
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  const fetchUserInviteCodes = async (): Promise<InviteCode[]> => {
    if (!user) return [];
    
    try {
      const { db } = getFirebaseInstances();
      if (!db) return [];
      
      const inviteCodesRef = collection(db, "inviteCodes");
      const q = query(inviteCodesRef, where("createdBy", "==", user.uid));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        code: doc.id,
      })) as InviteCode[];
    } catch (err) {
      console.error("Error fetching invite codes:", err);
      return [];
    }
  };

  return {
    user,
    userProfile,
    loading,
    error,
    isAuthenticated: !!user,
    logout,
    refreshProfile,
    fetchUserInviteCodes,
  };
}
