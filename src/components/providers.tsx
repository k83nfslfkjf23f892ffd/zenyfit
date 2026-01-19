'use client';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-provider';
import { CelebrationProvider } from '@/lib/celebration-context';
import { SplashScreen } from '@/components/SplashScreen';
import { Toaster } from 'sonner';

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  return (
    <SplashScreen loading={loading}>
      <CelebrationProvider>
        {children}
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
