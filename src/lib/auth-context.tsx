'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { initializeFirebase, getFirebaseInstances } from '@/lib/firebase-client';
import type { User } from '@shared/schema';

const USER_CACHE_KEY = 'zenyfit_user_cache';

function getCachedUser(): User | null {
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function setCachedUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // Ignore cache errors
  }
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  setOnLevelUpCallback?: (callback: (newLevel: number) => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    // Load cached user on initial render
    if (typeof window !== 'undefined') {
      return getCachedUser();
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const previousLevelRef = useRef<number | null>(null);
  const onLevelUpCallbackRef = useRef<((newLevel: number) => void) | undefined>(undefined);

  // Initialize Firebase on mount
  useEffect(() => {
    initializeFirebase()
      .then(() => {
        setFirebaseInitialized(true);
      })
      .catch((error) => {
        console.error('Failed to initialize Firebase:', error);
        setLoading(false);
      });
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    if (!firebaseInitialized) return;

    const { auth } = getFirebaseInstances();

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [firebaseInitialized]);

  // Listen to Firestore user document changes
  useEffect(() => {
    if (!firebaseUser) return;

    const { db } = getFirebaseInstances();
    const userDocRef = doc(db, 'users', firebaseUser.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data() as User;

          // Check for level-up
          if (previousLevelRef.current !== null && userData.level > previousLevelRef.current) {
            // Level increased! Trigger celebration
            if (onLevelUpCallbackRef.current) {
              onLevelUpCallbackRef.current(userData.level);
            }
          }

          // Update previous level
          previousLevelRef.current = userData.level;

          setUser(userData);
          setCachedUser(userData);
        } else {
          setUser(null);
          setCachedUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to user document:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [firebaseUser]);

  const signIn = async (username: string, password: string) => {
    const { auth } = getFirebaseInstances();
    const { usernameToEmail } = await import('@shared/constants');
    const email = usernameToEmail(username);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOutUser = async () => {
    const { auth } = getFirebaseInstances();
    setCachedUser(null);
    await signOut(auth);
  };

  const setOnLevelUp = (callback: (newLevel: number) => void) => {
    onLevelUpCallbackRef.current = callback;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signIn,
        signOutUser,
        setOnLevelUpCallback: setOnLevelUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
