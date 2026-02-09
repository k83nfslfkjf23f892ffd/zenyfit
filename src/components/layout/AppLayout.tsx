'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from './BottomNav';
import { useScrollPosition } from '@/hooks/useScrollPosition';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isScrolled } = useScrollPosition();

  return (
    <div className="min-h-screen bg-background relative">
      {/* Gradient mesh background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.03] blur-3xl"
          style={{ background: 'rgb(var(--gradient-from))' }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-[0.03] blur-3xl"
          style={{ background: 'rgb(var(--gradient-to))' }}
        />
      </div>

      {/* Status bar - blends with page at top, frosted when scrolled */}
      <div
        className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] z-40"
        style={{
          background: isScrolled ? 'rgb(var(--glass) / 0.05)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(24px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(24px)' : 'none',
          borderBottom: isScrolled ? '1px solid rgb(var(--glass-border) / 0.12)' : '1px solid transparent',
        }}
      />

      <main className="relative z-10 container mx-auto max-w-2xl px-4 py-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+4rem+env(safe-area-inset-bottom))]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {children}
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
}
