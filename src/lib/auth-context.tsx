'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { initializeFirebase, getFirebaseInstances } from '@/lib/firebase-client';
import type { User } from '@shared/schema';

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
  const [user, setUser] = useState<User | null>(null);
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
        } else {
          setUser(null);
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
