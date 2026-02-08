'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Target, Users, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollPosition } from '@/hooks/useScrollPosition';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/log', label: 'Log', icon: Dumbbell },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/challenges', label: 'Challenges', icon: Target },
  { href: '/social', label: 'Social', icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isAtBottom } = useScrollPosition();

  const preventContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl select-none transition-all duration-300"
      style={{
        background: isAtBottom ? 'rgb(var(--background))' : 'rgb(var(--glass) / 0.1)',
        backdropFilter: isAtBottom ? 'none' : 'blur(24px)',
        WebkitBackdropFilter: isAtBottom ? 'none' : 'blur(24px)',
        borderTop: isAtBottom ? '1px solid transparent' : '1px solid rgb(var(--glass-border) / 0.12)',
        touchAction: 'manipulation',
        WebkitTouchCallout: 'none',
      }}
      onContextMenu={preventContextMenu}
    >
      <div className="flex items-center pt-2">
        {navItems.map(({ href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-foreground/60 hover:text-foreground/80'
              )}
              onContextMenu={preventContextMenu}
              style={{ WebkitTouchCallout: 'none' }}
            >
              <Icon className={cn('h-7 w-7 transition-all duration-200', isActive && 'fill-primary drop-shadow-[0_0_8px_rgb(var(--glow)/0.5)]')} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
