'use client';

import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-[calc(4rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <main className="container mx-auto max-w-2xl px-4 py-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
