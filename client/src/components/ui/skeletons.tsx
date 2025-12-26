import { Skeleton } from "./skeleton";
import { Card, CardContent } from "./card";

export function WorkoutLogSkeleton() {
  return (
    <div className="flex justify-between items-center pb-3 border-b border-dashed border-border/50">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-6 w-16 ml-auto" />
      </div>
    </div>
  );
}

export function ChallengeCardSkeleton() {
  return (
    <Card className="overflow-hidden border-none shadow-sm dark:bg-zinc-900">
      <CardContent className="p-0">
        <div className="bg-card dark:bg-zinc-900 p-4">
          <div className="flex justify-between items-start mb-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-3 w-full mb-3" />
          <div className="space-y-2 mb-3">
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-8 h-8 rounded-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeaderboardEntrySkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b dark:border-zinc-700 last:border-0">
      <div className="flex items-center gap-4">
        <Skeleton className="w-6 h-6" />
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="text-right space-y-1">
        <Skeleton className="h-5 w-12 ml-auto" />
        <Skeleton className="h-3 w-8 ml-auto" />
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <Card className="border-none shadow-sm dark:bg-zinc-900">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export function ProfileCardSkeleton() {
  return (
    <Card className="border-none shadow-sm dark:bg-zinc-900">
      <CardContent className="p-6 flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
