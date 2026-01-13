'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode, useEffect } from 'react';
import { themes } from './themes';

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Apply theme CSS variables when theme changes
    const applyTheme = (themeId: string) => {
      const theme = themes.find((t) => t.id === themeId);
      if (!theme) return;

      const root = document.documentElement;
      root.style.setProperty('--background', theme.colors.background);
      root.style.setProperty('--foreground', theme.colors.foreground);
      root.style.setProperty('--primary', theme.colors.primary);
      root.style.setProperty('--primary-foreground', theme.colors.primaryForeground);
      root.style.setProperty('--secondary', theme.colors.secondary);
      root.style.setProperty('--accent', theme.colors.accent);
      root.style.setProperty('--muted', theme.colors.muted);
      root.style.setProperty('--border', theme.colors.border);
    };

    // Listen for theme changes
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
      defaultTheme="timepage-v2"
      themes={themes.map((t) => t.id)}
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
