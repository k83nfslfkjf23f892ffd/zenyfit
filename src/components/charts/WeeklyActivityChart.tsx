'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useHoldToReveal, tooltipVisibility, barHighlightCursor, holdTransition } from '@/lib/use-hold-to-reveal';

interface WeeklyActivityData {
  day: string;
  workouts: number;
  xp: number;
}

interface WeeklyActivityChartProps {
  data: WeeklyActivityData[];
  title?: string;
  description?: string;
}

export function WeeklyActivityChart({
  data,
  title = 'Weekly Activity',
  description = 'Your workout activity this week',
}: WeeklyActivityChartProps) {
  const { isHolding, handlers } = useHoldToReveal();
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-foreground/40">
            No activity data for this week
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent {...handlers}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="day"
              className="text-xs"
              tick={{ fill: 'rgb(var(--foreground) / 0.4)' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'rgb(var(--foreground) / 0.4)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              wrapperStyle={tooltipVisibility(isHolding)}
              cursor={isHolding ? barHighlightCursor : false}
            />
            <Legend />
            <Bar
              dataKey="workouts"
              fill="hsl(var(--primary))"
              fillOpacity={isHolding ? 0.4 : 1}
              radius={[8, 8, 0, 0]}
              name="Workouts"
              style={holdTransition}
            />
            <Bar
              dataKey="xp"
              fill="hsl(var(--chart-2))"
              fillOpacity={isHolding ? 0.4 : 1}
              radius={[8, 8, 0, 0]}
              name="XP Earned"
              style={holdTransition}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
