'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ExerciseTotalsWidgetProps {
  totals: Record<string, number>;
}

export function ExerciseTotalsWidget({ totals }: ExerciseTotalsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercise Totals</CardTitle>
        <CardDescription>Lifetime statistics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="font-medium">Pull-ups</span>
          <span className="text-lg font-bold">{totals.pullups || 0}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="font-medium">Push-ups</span>
          <span className="text-lg font-bold">{totals.pushups || 0}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="font-medium">Dips</span>
          <span className="text-lg font-bold">{totals.dips || 0}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="font-medium">Running</span>
          <span className="text-lg font-bold">{totals.running || 0} km</span>
        </div>
      </CardContent>
    </Card>
  );
}
