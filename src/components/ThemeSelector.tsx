'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { themes, parseThemeId, composeThemeId, type ThemeMode } from '@/lib/themes';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const modes: { value: ThemeMode; label: string }[] = [
  { value: 'oled', label: 'OLED' },
  { value: 'dark', label: 'Dark' },
  { value: 'bright', label: 'Bright' },
];

export function ThemeSelector() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg bg-border/20 animate-pulse ml-auto" />
        <div className="grid grid-cols-3 gap-3">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="aspect-[4/3] rounded-xl bg-border/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const { baseId: currentBase, mode: currentMode } = parseThemeId(currentTheme || 'forest');

  const selectMode = (mode: ThemeMode) => {
    setTheme(composeThemeId(currentBase, mode));
  };

  const modeOrder: ThemeMode[] = ['oled', 'dark', 'bright'];

  const selectTheme = (baseId: string) => {
    if (baseId === currentBase) {
      // Already selected — cycle to next brightness mode
      const nextMode = modeOrder[(modeOrder.indexOf(currentMode) + 1) % modeOrder.length];
      setTheme(composeThemeId(baseId, nextMode));
    } else {
      setTheme(composeThemeId(baseId, currentMode));
    }
  };

  return (
    <div className="space-y-4">
      {/* Brightness mode toggle */}
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-lg p-0.5 bg-muted/60">
          {modes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => selectMode(value)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-all duration-200',
                currentMode === value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground/50 active:text-foreground/80'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme color grid */}
      <div className="grid grid-cols-3 gap-3">
        {themes.map((theme) => {
          const isSelected = currentBase === theme.id;
          const gradFrom = `rgb(${theme.colors.gradientFrom})`;
          const gradTo = `rgb(${theme.colors.gradientTo})`;

          // Preview colors change based on selected mode
          const previewBg = currentMode === 'oled' ? 'rgb(0 0 0)'
            : currentMode === 'bright' ? 'rgb(248 248 252)'
            : `rgb(${theme.colors.background})`;
          const previewSurface = currentMode === 'oled' ? 'rgb(8 8 10)'
            : currentMode === 'bright' ? 'rgb(255 255 255)'
            : `rgb(${theme.colors.surface})`;
          const previewBorder = currentMode === 'oled' ? 'rgb(24 24 30)'
            : currentMode === 'bright' ? 'rgb(218 222 230)'
            : `rgb(${theme.colors.border})`;
          const previewFg = currentMode === 'bright' ? 'rgb(20 20 30)'
            : `rgb(${theme.colors.foreground})`;

          return (
            <button
              key={theme.id}
              onClick={() => selectTheme(theme.id)}
              className={cn(
                'relative aspect-[4/3] rounded-xl p-3 transition-all duration-200 overflow-hidden',
                isSelected
                  ? 'ring-2 ring-primary glow-sm scale-[1.02]'
                  : 'ring-1 ring-border/30 hover:ring-border/60 active:scale-[0.97]'
              )}
              style={{ background: previewBg }}
            >
              {/* Mini preview of the theme */}
              <div className="flex h-full flex-col justify-between">
                {/* Gradient bar preview */}
                <div
                  className="h-1.5 w-3/4 rounded-full"
                  style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
                />

                {/* Mini card preview */}
                <div
                  className="rounded-md p-1.5 mt-1.5 flex-1"
                  style={{ background: previewSurface, border: `1px solid ${previewBorder}` }}
                >
                  <div
                    className="h-1 w-1/2 rounded-full opacity-40"
                    style={{ background: previewFg }}
                  />
                </div>

                {/* Theme name */}
                <div
                  className="text-[10px] font-semibold mt-1.5"
                  style={{ color: previewFg }}
                >
                  {theme.name}
                </div>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div
                  className="absolute top-1.5 right-1.5 rounded-full p-0.5"
                  style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
                >
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
