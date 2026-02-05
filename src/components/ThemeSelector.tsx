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
      <div className="grid grid-cols-3 gap-3">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className="aspect-[4/3] rounded-xl bg-border/20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {themes.map((theme) => {
        const isSelected = currentTheme === theme.id;
        const bg = `rgb(${theme.colors.background})`;
        const gradFrom = `rgb(${theme.colors.gradientFrom})`;
        const gradTo = `rgb(${theme.colors.gradientTo})`;
        const surface = `rgb(${theme.colors.surface})`;
        const border = `rgb(${theme.colors.border})`;
        const fg = `rgb(${theme.colors.foreground})`;

        return (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={cn(
              'relative aspect-[4/3] rounded-xl p-3 transition-all duration-200 overflow-hidden',
              isSelected
                ? 'ring-2 ring-primary glow-sm scale-[1.02]'
                : 'ring-1 ring-border/30 hover:ring-border/60 active:scale-[0.97]'
            )}
            style={{ background: bg }}
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
                style={{ background: surface, border: `1px solid ${border}` }}
              >
                <div
                  className="h-1 w-1/2 rounded-full opacity-40"
                  style={{ background: fg }}
                />
              </div>

              {/* Theme name */}
              <div
                className="text-[10px] font-semibold mt-1.5"
                style={{ color: fg }}
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
  );
}
