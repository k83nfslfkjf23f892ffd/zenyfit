'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode, useEffect } from 'react';
import { resolveTheme, ALL_THEME_IDS } from './themes';

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const applyTheme = (themeId: string) => {
      const theme = resolveTheme(themeId);
      if (!theme) return;

      const root = document.documentElement;
      // Core colors
      root.style.setProperty('--background', theme.colors.background);
      root.style.setProperty('--foreground', theme.colors.foreground);
      root.style.setProperty('--primary', theme.colors.primary);
      root.style.setProperty('--primary-foreground', theme.colors.primaryForeground);
      root.style.setProperty('--secondary', theme.colors.secondary);
      root.style.setProperty('--accent', theme.colors.accent);
      root.style.setProperty('--muted', theme.colors.muted);
      root.style.setProperty('--border', theme.colors.border);

      // Premium tokens
      root.style.setProperty('--gradient-from', theme.colors.gradientFrom);
      root.style.setProperty('--gradient-to', theme.colors.gradientTo);
      root.style.setProperty('--glass', theme.colors.glass);
      root.style.setProperty('--glass-border', theme.colors.glassBorder);
      root.style.setProperty('--glow', theme.colors.glow);
      root.style.setProperty('--surface', theme.colors.surface);

      // Chart palette
      root.style.setProperty('--chart-1', theme.colors.chart1);
      root.style.setProperty('--chart-2', theme.colors.chart2);
      root.style.setProperty('--chart-3', theme.colors.chart3);
      root.style.setProperty('--chart-4', theme.colors.chart4);
      root.style.setProperty('--chart-5', theme.colors.chart5);

      // Set color-scheme for browser chrome
      root.style.setProperty('color-scheme', theme.isDark ? 'dark' : 'light');
    };

    const observer = new MutationObserver(() => {
      const themeId = document.documentElement.getAttribute('data-theme');
      if (themeId) {
        applyTheme(themeId);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Apply initial theme
    const initialTheme = document.documentElement.getAttribute('data-theme');
    if (initialTheme) {
      applyTheme(initialTheme);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="midnight"
      themes={ALL_THEME_IDS}
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
