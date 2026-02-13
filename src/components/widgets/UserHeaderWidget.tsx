'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Settings } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getXPInCurrentLevel, getXPNeededForNextLevel } from '@shared/constants';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { getAvatarDisplayUrl, getUserAvatar, getAvatarInitials } from '@/lib/avatar';

interface UserHeaderWidgetProps {
  user: {
    username: string;
    level: number;
    xp: number;
    avatar?: string;
  };
}

export const UserHeaderWidget = memo(function UserHeaderWidget({ user }: UserHeaderWidgetProps) {
  const xpInLevel = getXPInCurrentLevel(user.xp, user.level);
  const xpNeeded = getXPNeededForNextLevel(user.level);
  const progressPercent = (xpInLevel / xpNeeded) * 100;
  const avatarUrl = getAvatarDisplayUrl(user.avatar, user.username);
  const dicebearFallback = getUserAvatar(user.username);
  // 0 = primary URL, 1 = DiceBear fallback, 2 = initials
  const [errorStage, setErrorStage] = useState(0);

  const currentSrc = errorStage === 0 ? avatarUrl
    : errorStage === 1 ? dicebearFallback
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentSrc ? (
            <Image
              src={currentSrc}
              alt={user.username}
              width={44}
              height={44}
              className="h-11 w-11 rounded-full bg-border/20 object-cover"
              onError={() => setErrorStage(prev => prev + 1)}
              unoptimized={!currentSrc.includes('dicebear.com')}
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {getAvatarInitials(user.username)}
            </div>
          )}
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
        <Link
            href="/profile/settings"
            className="h-10 w-10 flex items-center justify-center rounded-lg active:bg-foreground/10 transition-colors"
          >
            <Settings className="h-5 w-5 text-foreground/40" />
          </Link>
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
});
