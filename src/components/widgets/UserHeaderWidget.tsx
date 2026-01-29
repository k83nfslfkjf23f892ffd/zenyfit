'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getXPInCurrentLevel, getXPNeededForNextLevel } from '@shared/constants';

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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{user.username}</CardTitle>
            <CardDescription>Level {user.level}</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{user.xp.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total XP</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to Level {user.level + 1}</span>
            <span className="text-muted-foreground">
              {xpInLevel} / {xpNeeded} XP
            </span>
          </div>
          <Progress value={progressPercent} />
        </div>
      </CardContent>
    </Card>
  );
}
