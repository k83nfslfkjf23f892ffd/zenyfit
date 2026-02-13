'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef } from 'react';
import { Home, Trophy, Target, Users, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/log', label: 'Log', icon: Dumbbell },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/challenges', label: 'Challenges', icon: Target },
  { href: '/social', label: 'Social', icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl select-none"
      style={{
        background: 'rgb(var(--glass) / 0.1)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgb(var(--glass-border) / 0.12)',
        touchAction: 'none',
        overscrollBehavior: 'none',
        overflow: 'hidden',
        WebkitTouchCallout: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center pt-2">
        {navItems.map(({ href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
                isActive
                  ? 'text-primary'
                  : 'text-foreground/60 active:text-foreground/80'
              )}
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                touchStartRef.current = { x: touch.clientX, y: touch.clientY };
              }}
              onTouchEnd={(e) => {
                if (!touchStartRef.current) return;
                const touch = e.changedTouches[0];
                const dx = Math.abs(touch.clientX - touchStartRef.current.x);
                const dy = Math.abs(touch.clientY - touchStartRef.current.y);
                touchStartRef.current = null;
                if (dx < 10 && dy < 10) {
                  e.preventDefault();
                  router.push(href);
                }
              }}
              style={{ WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon className={cn('h-7 w-7', isActive && 'fill-primary drop-shadow-[0_0_8px_rgb(var(--glow)/0.5)]')} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
