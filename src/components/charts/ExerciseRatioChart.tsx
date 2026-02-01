'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface ExerciseRatioChartProps {
  totals: {
    pullups?: number;
    pushups?: number;
    dips?: number;
    running?: number;
  } | null;
  title?: string;
}

// Pastel, pleasant colors (soft lavender, peach, mint)
const PASTEL_COLORS = ['#c4b5fd', '#fcd5ce', '#b5ead7'];

// Dark/black monochrome colors
const BLACK_COLORS = ['#1f2937', '#374151', '#4b5563'];

// Original theme colors (CSS variables) - how it was before toggle was added
const THEME_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

const EXERCISE_CONFIG = [
  { key: 'pullups', name: 'Pull-ups', unit: 'reps' },
  { key: 'pushups', name: 'Push-ups', unit: 'reps' },
  { key: 'dips', name: 'Dips', unit: 'reps' },
];

type ColorMode = 'theme' | 'pastel' | 'black';

const STORAGE_KEY = 'zenyfit_chart_color_mode';

export function ExerciseRatioChart({
  totals,
  title = 'Calisthenics Distribution',
}: ExerciseRatioChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('theme');
  const [mounted, setMounted] = useState(false);

  // Load saved color mode on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorMode | null;
    if (saved === 'theme' || saved === 'pastel' || saved === 'black') {
      setColorMode(saved);
    }
    setMounted(true);
  }, []);

  // Save color mode when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, colorMode);
    }
  }, [colorMode, mounted]);

  const cycleColorMode = () => {
    const modes: ColorMode[] = ['theme', 'pastel', 'black'];
    const currentIndex = modes.indexOf(colorMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setColorMode(modes[nextIndex]);
  };

  const getColor = (index: number): string => {
    switch (colorMode) {
      case 'theme':
        return THEME_COLORS[index] || THEME_COLORS[0];
      case 'pastel':
        return PASTEL_COLORS[index] || PASTEL_COLORS[0];
      case 'black':
        return BLACK_COLORS[index] || BLACK_COLORS[0];
    }
  };

  const data = EXERCISE_CONFIG
    .map((config, index) => ({
      name: config.name,
      value: totals?.[config.key as keyof typeof totals] || 0,
      color: getColor(index),
      unit: config.unit,
    }))
    .filter(e => e.value > 0);

  if (data.length === 0) {
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

  const getModeLabel = () => {
    switch (colorMode) {
      case 'theme': return 'Theme colors';
      case 'pastel': return 'Pastel colors';
      case 'black': return 'Dark colors';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={cycleColorMode}
            title={`Current: ${getModeLabel()}. Click to change.`}
          >
            <Palette className={`h-4 w-4 ${colorMode !== 'theme' ? 'text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={2}
                dataKey="value"
                animationDuration={400}
                onClick={(_, index) => setActiveIndex(activeIndex === index ? null : index)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
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
                  <div className="text-2xl font-bold">{total.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </>
              )}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
