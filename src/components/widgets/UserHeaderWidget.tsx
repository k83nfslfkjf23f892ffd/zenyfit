'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getXPInCurrentLevel, getXPNeededForNextLevel } from '@shared/constants';
import { AnimatedNumber } from '@/components/AnimatedNumber';

interface UserHeaderWidgetProps {
  user: {
    username: string;
    level: number;
    xp: number;
  };
}

export function UserHeaderWidget({ user }: UserHeaderWidgetProps) {
  const xpInLevel = getXPInCurrentLevel(user.xp, user.level);
  const xpNeeded = getXPNeededForNextLevel(user.level);
  const progressPercent = (xpInLevel / xpNeeded) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
