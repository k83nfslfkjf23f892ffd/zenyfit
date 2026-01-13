'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-provider';
import { CelebrationProvider } from '@/lib/celebration-context';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CelebrationProvider>
          {children}
          <Toaster position="top-center" />
        </CelebrationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
