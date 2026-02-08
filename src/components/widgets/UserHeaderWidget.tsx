'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Settings } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getXPInCurrentLevel, getXPNeededForNextLevel } from '@shared/constants';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { getAvatarDisplayUrl } from '@/lib/avatar';

interface UserHeaderWidgetProps {
  user: {
    username: string;
    level: number;
    xp: number;
    avatar?: string;
  };
}

export function UserHeaderWidget({ user }: UserHeaderWidgetProps) {
  const xpInLevel = getXPInCurrentLevel(user.xp, user.level);
  const xpNeeded = getXPNeededForNextLevel(user.level);
  const progressPercent = (xpInLevel / xpNeeded) * 100;
  const avatarUrl = getAvatarDisplayUrl(user.avatar, user.username);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={avatarUrl}
            alt={user.username}
            width={44}
            height={44}
            className="h-11 w-11 rounded-full bg-border/20 object-cover"
            unoptimized
          />
          <div>
            <h1 className="text-2xl font-bold gradient-text">
              {user.username}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default">Lv. {user.level}</Badge>
              <span className="text-sm text-foreground/50">
                <AnimatedNumber value={user.xp} /> XP
              </span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/profile/settings">
            <Settings className="h-5 w-5 text-foreground/40" />
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-foreground/50">
          <span>Level {user.level + 1}</span>
          <span>{xpInLevel} / {xpNeeded} XP</span>
        </div>
        <Progress value={progressPercent} glow />
      </div>
    </div>
  );
}
