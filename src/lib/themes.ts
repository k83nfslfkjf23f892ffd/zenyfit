// Premium theme configuration for ZenyFit v2.0

export type ThemeMode = 'oled' | 'dark' | 'bright';

export interface Theme {
  id: string;
  name: string;
  isDark: boolean;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    accent: string;
    muted: string;
    border: string;
    // Premium additions
    gradientFrom: string;
    gradientTo: string;
    glass: string;
    glassBorder: string;
    glow: string;
    surface: string;
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
  };
}

// Base themes define the color identity (accent, primary, gradients, charts).
// Background/surface/border are for the default "dark" mode and get overridden
// by OLED and Bright variants via resolveTheme().
export const themes: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    isDark: true,
    colors: {
      background: '13 13 28',
      foreground: '226 232 240',
      primary: '129 140 248',
      primaryForeground: '255 255 255',
      secondary: '99 102 241',
      accent: '167 139 250',
      muted: '30 30 52',
      border: '45 45 80',
      gradientFrom: '99 102 241',
      gradientTo: '168 85 247',
      glass: '255 255 255',
      glassBorder: '255 255 255',
      glow: '129 140 248',
      surface: '22 22 45',
      chart1: '129 140 248',
      chart2: '167 139 250',
      chart3: '99 102 241',
      chart4: '196 181 253',
      chart5: '79 70 229',
    },
  },
  {
    id: 'solar',
    name: 'Solar',
    isDark: true,
    colors: {
      background: '18 14 8',
      foreground: '235 225 210',
      primary: '245 158 11',
      primaryForeground: '0 0 0',
      secondary: '234 88 12',
      accent: '251 191 36',
      muted: '36 28 16',
      border: '62 48 24',
      gradientFrom: '245 158 11',
      gradientTo: '251 191 36',
      glass: '255 255 255',
      glassBorder: '255 255 255',
      glow: '245 158 11',
      surface: '28 22 12',
      chart1: '245 158 11',
      chart2: '251 191 36',
      chart3: '234 88 12',
      chart4: '253 224 71',
      chart5: '249 115 22',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    isDark: true,
    colors: {
      background: '10 18 18',
      foreground: '220 235 230',
      primary: '20 184 166',
      primaryForeground: '255 255 255',
      secondary: '16 185 129',
      accent: '34 211 238',
      muted: '20 36 36',
      border: '30 60 56',
      gradientFrom: '20 184 166',
      gradientTo: '34 211 238',
      glass: '255 255 255',
      glassBorder: '255 255 255',
      glow: '20 184 166',
      surface: '16 28 28',
      chart1: '20 184 166',
      chart2: '34 211 238',
      chart3: '16 185 129',
      chart4: '110 231 183',
      chart5: '6 182 212',
    },
  },
  {
    id: 'cherry',
    name: 'Cherry',
    isDark: true,
    colors: {
      background: '18 8 14',
      foreground: '235 215 225',
      primary: '220 38 76',
      primaryForeground: '255 255 255',
      secondary: '190 24 93',
      accent: '244 63 94',
      muted: '36 16 26',
      border: '62 24 42',
      gradientFrom: '220 38 76',
      gradientTo: '244 63 94',
      glass: '255 255 255',
      glassBorder: '255 255 255',
      glow: '220 38 76',
      surface: '28 12 20',
      chart1: '220 38 76',
      chart2: '244 63 94',
      chart3: '190 24 93',
      chart4: '251 113 133',
      chart5: '159 18 57',
    },
  },
  {
    id: 'phantom',
    name: 'Phantom',
    isDark: true,
    colors: {
      background: '10 10 10',
      foreground: '212 212 212',
      primary: '212 212 212',
      primaryForeground: '10 10 10',
      secondary: '163 163 163',
      accent: '229 229 229',
      muted: '23 23 23',
      border: '38 38 38',
      gradientFrom: '163 163 163',
      gradientTo: '212 212 212',
      glass: '255 255 255',
      glassBorder: '255 255 255',
      glow: '163 163 163',
      surface: '18 18 18',
      chart1: '212 212 212',
      chart2: '163 163 163',
      chart3: '115 115 115',
      chart4: '229 229 229',
      chart5: '82 82 82',
    },
  },
  {
    id: 'daylight',
    name: 'Daylight',
    isDark: false,
    colors: {
      background: '250 250 252',
      foreground: '15 23 42',
      primary: '59 130 246',
      primaryForeground: '255 255 255',
      secondary: '37 99 235',
      accent: '99 102 241',
      muted: '241 245 249',
      border: '226 232 240',
      gradientFrom: '59 130 246',
      gradientTo: '99 102 241',
      glass: '255 255 255',
      glassBorder: '15 23 42',
      glow: '59 130 246',
      surface: '255 255 255',
      chart1: '59 130 246',
      chart2: '99 102 241',
      chart3: '37 99 235',
      chart4: '147 197 253',
      chart5: '79 70 229',
    },
  },
];

// Parse a compound theme ID like "midnight-oled" into base + mode.
// Bare IDs (e.g. "midnight") default to "dark" mode.
export function parseThemeId(id: string): { baseId: string; mode: ThemeMode } {
  if (id.endsWith('-oled')) return { baseId: id.slice(0, -5), mode: 'oled' };
  if (id.endsWith('-bright')) return { baseId: id.slice(0, -7), mode: 'bright' };
  return { baseId: id, mode: 'dark' };
}

export function composeThemeId(baseId: string, mode: ThemeMode): string {
  if (mode === 'dark') return baseId;
  return `${baseId}-${mode}`;
}

// Resolve a compound theme ID into a full Theme object with derived colors.
export function resolveTheme(id: string): Theme | undefined {
  const { baseId, mode } = parseThemeId(id);
  const base = themes.find((t) => t.id === baseId);
  if (!base) return undefined;

  if (mode === 'dark') return base;

  if (mode === 'oled') {
    return {
      ...base,
      id,
      isDark: true,
      colors: {
        ...base.colors,
        background: '0 0 0',
        surface: '8 8 10',
        muted: '14 14 18',
        border: '24 24 30',
      },
    };
  }

  // bright
  return {
    ...base,
    id,
    isDark: false,
    colors: {
      ...base.colors,
      background: '248 248 252',
      foreground: '20 20 30',
      surface: '255 255 255',
      muted: '240 242 246',
      border: '218 222 230',
      glass: '255 255 255',
      glassBorder: '20 20 30',
    },
  };
}

// All valid theme IDs (18 total: 6 base × 3 modes)
export const ALL_THEME_IDS: string[] = themes.flatMap((t) => [
  t.id,
  `${t.id}-oled`,
  `${t.id}-bright`,
]);

export function getThemeById(id: string): Theme | undefined {
  return resolveTheme(id);
}

export const defaultTheme = themes[0];
