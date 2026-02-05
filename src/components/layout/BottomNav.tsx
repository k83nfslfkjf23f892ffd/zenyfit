'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Target, User, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/log', label: 'Log', icon: Dumbbell },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/challenges', label: 'Challenges', icon: Target },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  const preventContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass-strong rounded-t-2xl select-none"
      style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none' }}
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
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-foreground/40 hover:text-foreground/60'
              )}
              onContextMenu={preventContextMenu}
              style={{ WebkitTouchCallout: 'none' }}
            >
              <Icon className={cn('h-6 w-6 transition-all duration-200', isActive && 'drop-shadow-[0_0_8px_rgb(var(--glow)/0.5)]')} />
              {isActive && (
                <div className="h-1 w-1 rounded-full gradient-bg" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
