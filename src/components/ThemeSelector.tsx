'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { themes } from '@/lib/themes';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className="aspect-square rounded-lg border-2 border-border bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {themes.map((theme) => {
        const isSelected = currentTheme === theme.id;
        const bg = `rgb(${theme.colors.background})`;
        const fg = `rgb(${theme.colors.foreground})`;
        const primary = `rgb(${theme.colors.primary})`;

        return (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={cn(
              'relative aspect-square rounded-lg border-2 p-3 transition-all hover:scale-105',
              isSelected
                ? 'border-primary shadow-lg'
                : 'border-border hover:border-primary/50'
            )}
            style={{
              background: bg,
              color: fg,
            }}
          >
            {/* Theme Preview */}
            <div className="flex h-full flex-col justify-between">
              {/* Preview bars */}
              <div className="space-y-1">
                <div
                  className="h-2 w-3/4 rounded"
                  style={{ background: primary }}
                />
                <div
                  className="h-2 w-1/2 rounded opacity-50"
                  style={{ background: fg }}
                />
              </div>

              {/* Theme name */}
              <div className="text-[10px] font-semibold">{theme.name}</div>
            </div>

            {/* Selected indicator */}
            {isSelected && (
              <div
                className="absolute top-1 right-1 rounded-full p-1"
                style={{ background: primary }}
              >
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
