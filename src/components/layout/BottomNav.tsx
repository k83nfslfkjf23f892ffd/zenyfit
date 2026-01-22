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

  // Prevent long-press context menu
  const preventContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background select-none"
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
                'flex flex-1 items-center justify-center rounded-lg px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onContextMenu={preventContextMenu}
              style={{ WebkitTouchCallout: 'none' }}
            >
              <Icon className={cn('h-7 w-7', isActive && 'fill-primary')} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
