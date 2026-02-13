'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useHoldToReveal, tooltipVisibility, HighlightCursor, holdActiveDot, holdTransition } from '@/lib/use-hold-to-reveal';

interface UserGrowthData {
  date: string;
  users: number;
  newUsers?: number;
}

interface UserGrowthChartProps {
  data: UserGrowthData[];
  title?: string;
  description?: string;
}

export function UserGrowthChart({
  data,
  title = 'User Growth',
  description = 'Platform user growth over time',
}: UserGrowthChartProps) {
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
            No growth data available
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
      <CardContent>
        <div {...handlers}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
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
              cursor={isHolding ? <HighlightCursor /> : false}
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="hsl(var(--primary))"
              strokeOpacity={isHolding ? 0.4 : 1}
              fillOpacity={isHolding ? 0.4 : 1}
              fill="url(#colorUsers)"
              name="Total Users"
              activeDot={isHolding ? holdActiveDot('hsl(var(--primary))') : false}
              style={holdTransition}
            />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
