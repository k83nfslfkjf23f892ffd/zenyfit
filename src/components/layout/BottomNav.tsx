'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Target, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
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
      <div className="flex items-center justify-around px-2 py-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map(({ href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center justify-center rounded-lg p-3 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onContextMenu={preventContextMenu}
              style={{ WebkitTouchCallout: 'none' }}
            >
              <Icon className={cn('h-7 w-7', isActive && 'fill-current stroke-[hsl(var(--background))]')} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
