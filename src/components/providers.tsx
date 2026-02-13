'use client';

import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-provider';
import { CelebrationProvider } from '@/lib/celebration-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SplashScreen } from '@/components/SplashScreen';
import { Toaster } from 'sonner';
import { initSyncEngine } from '@/lib/offline-sync';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { getFirebaseInstances } from '@/lib/firebase-client';
import '@/lib/offline-fetch';

function SyncEngineInitializer() {
  const { firebaseUser } = useAuth();

  useEffect(() => {
    if (firebaseUser) {
      initSyncEngine(firebaseUser);
    }
  }, [firebaseUser]);

  return null;
}

// Disable Firestore network when offline to prevent iOS "Turn off airplane mode" popup.
// Firebase's own WebSocket/XHR reconnect attempts bypass our fetch interceptor.
function FirebaseNetworkManager() {
  const { firebaseUser } = useAuth();

  useEffect(() => {
    if (!firebaseUser) return;

    let dbInstance: ReturnType<typeof getFirebaseInstances>['db'] | null = null;
    try {
      dbInstance = getFirebaseInstances().db;
    } catch {
      return;
    }

    const db = dbInstance;

    function handleOffline() {
      disableNetwork(db).catch(() => {});
    }

    function handleOnline() {
      enableNetwork(db).catch(() => {});
    }

    // Set initial state
    if (!navigator.onLine) {
      handleOffline();
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [firebaseUser]);

  return null;
}

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  return (
    <SplashScreen loading={loading}>
      <CelebrationProvider>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <SyncEngineInitializer />
        <FirebaseNetworkManager />
        <Toaster position="top-center" />
      </CelebrationProvider>
    </SplashScreen>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthenticatedApp>{children}</AuthenticatedApp>
      </AuthProvider>
    </ThemeProvider>
  );
}
