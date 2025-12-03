import { useState, useEffect } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { initializeFirebase, getFirebaseInstances } from "@/lib/firebase";

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

export const XP_RATES = {
  "pull-up": 15,
  "push-up": 3,
  "dip": 10,
  "run": 50,
} as const;

export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  500,    // Level 2
  1500,   // Level 3
  3000,   // Level 4
  5000,   // Level 5
  8000,   // Level 6
  12000,  // Level 7
  17000,  // Level 8
  23000,  // Level 9
  30000,  // Level 10
];

export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      if (i >= LEVEL_THRESHOLDS.length - 1) {
        const extraXP = xp - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
        return LEVEL_THRESHOLDS.length + Math.floor(extraXP / 7000);
      }
      return i + 1;
    }
  }
  return 1;
}

export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + ((currentLevel - LEVEL_THRESHOLDS.length + 1) * 7000);
  }
  return LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

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
                setUserProfile({
                  id: docSnap.id,
                  ...docSnap.data(),
                } as UserProfile);
              } else {
                setUserProfile(null);
              }
              setLoading(false);
            }, (err) => {
              console.error("Error fetching user profile:", err);
              setError("Failed to load user profile");
              setLoading(false);
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
