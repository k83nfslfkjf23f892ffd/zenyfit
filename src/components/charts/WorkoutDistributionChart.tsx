'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface WorkoutDistributionData {
  name: string;
  value: number;
  color: string;
}

interface WorkoutDistributionChartProps {
  data: WorkoutDistributionData[];
  title?: string;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function WorkoutDistributionChart({
  data,
  title = 'Workout Distribution',
}: WorkoutDistributionChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No workout data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const activeData = activeIndex !== null ? data[activeIndex] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                animationDuration={800}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={(_, index) => setActiveIndex(activeIndex === index ? null : index)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || COLORS[index % COLORS.length]}
                    stroke={activeIndex === index ? 'hsl(var(--foreground))' : 'transparent'}
                    strokeWidth={activeIndex === index ? 2 : 0}
                    style={{
                      filter: activeIndex !== null && activeIndex !== index ? 'opacity(0.5)' : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center text - shows selected or total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              {activeData ? (
                <>
                  <div className="text-2xl font-bold">{activeData.value}</div>
                  <div className="text-xs text-muted-foreground">{activeData.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {((activeData.value / total) * 100).toFixed(0)}%
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {data.map((entry, index) => (
            <button
              key={entry.name}
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
              className={`flex items-center gap-1.5 text-xs transition-opacity ${
                activeIndex !== null && activeIndex !== index ? 'opacity-50' : ''
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }}
              />
              <span>{entry.name}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
