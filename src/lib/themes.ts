// Theme configuration extracted from design-mockups/theme-prototype.html

export interface Theme {
  id: string;
  name: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    accent: string;
    muted: string;
    border: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'timepage-v2',
    name: 'Timepage V2',
    colors: {
      background: '10 10 10',
      foreground: '255 255 255',
      primary: '196 69 105',
      primaryForeground: '255 255 255',
      secondary: '139 30 20',
      accent: '196 69 105',
      muted: '30 30 30',
      border: '196 69 105',
    },
  },
  {
    id: 'timepage-v1',
    name: 'Timepage V1',
    colors: {
      background: '26 26 26',
      foreground: '255 255 255',
      primary: '198 40 40',
      primaryForeground: '255 255 255',
      secondary: '30 58 95',
      accent: '45 90 140',
      muted: '40 40 40',
      border: '30 58 95',
    },
  },
  {
    id: 'book',
    name: 'Book Tracker',
    colors: {
      background: '248 249 250',
      foreground: '44 62 80',
      primary: '77 184 196',
      primaryForeground: '255 255 255',
      secondary: '61 165 176',
      accent: '77 184 196',
      muted: '230 235 240',
      border: '77 184 196',
    },
  },
  {
    id: 'retro',
    name: 'Retro Music',
    colors: {
      background: '245 230 211',
      foreground: '58 37 23',
      primary: '107 154 196',
      primaryForeground: '255 255 255',
      secondary: '168 213 186',
      accent: '139 184 159',
      muted: '220 210 190',
      border: '139 184 159',
    },
  },
  {
    id: 'zen',
    name: 'Minimal Zen',
    colors: {
      background: '250 250 250',
      foreground: '20 20 20',
      primary: '60 130 140',
      primaryForeground: '255 255 255',
      secondary: '90 90 90',
      accent: '60 130 140',
      muted: '240 240 240',
      border: '200 200 200',
    },
  },
  {
    id: 'sport-tracker',
    name: 'Sport Tracker',
    colors: {
      background: '18 18 18',
      foreground: '255 255 255',
      primary: '34 197 94',
      primaryForeground: '0 0 0',
      secondary: '22 163 74',
      accent: '34 197 94',
      muted: '30 30 30',
      border: '34 197 94',
    },
  },
  {
    id: 'blue-journal',
    name: 'Blue Journal',
    colors: {
      background: '240 248 255',
      foreground: '30 58 138',
      primary: '59 130 246',
      primaryForeground: '255 255 255',
      secondary: '37 99 235',
      accent: '59 130 246',
      muted: '226 232 240',
      border: '59 130 246',
    },
  },
  {
    id: 'gratitude',
    name: 'Gratitude Pastel',
    colors: {
      background: '255 250 245',
      foreground: '90 60 80',
      primary: '236 72 153',
      primaryForeground: '255 255 255',
      secondary: '244 114 182',
      accent: '236 72 153',
      muted: '254 242 242',
      border: '244 114 182',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    colors: {
      background: '10 10 10',
      foreground: '255 255 255',
      primary: '0 255 255',
      primaryForeground: '0 0 0',
      secondary: '255 0 255',
      accent: '255 255 0',
      muted: '20 20 20',
      border: '0 255 255',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      background: '20 14 35',
      foreground: '255 255 255',
      primary: '251 146 60',
      primaryForeground: '0 0 0',
      secondary: '239 68 68',
      accent: '251 146 60',
      muted: '30 20 50',
      border: '251 146 60',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      background: '22 30 28',
      foreground: '240 253 244',
      primary: '34 197 94',
      primaryForeground: '0 0 0',
      secondary: '22 163 74',
      accent: '74 222 128',
      muted: '30 40 38',
      border: '34 197 94',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      background: '15 23 42',
      foreground: '241 245 249',
      primary: '14 165 233',
      primaryForeground: '255 255 255',
      secondary: '2 132 199',
      accent: '56 189 248',
      muted: '30 41 59',
      border: '14 165 233',
    },
  },
  {
    id: 'purple',
    name: 'Purple',
    colors: {
      background: '24 16 40',
      foreground: '250 245 255',
      primary: '168 85 247',
      primaryForeground: '255 255 255',
      secondary: '147 51 234',
      accent: '192 132 252',
      muted: '35 25 55',
      border: '168 85 247',
    },
  },
  {
    id: 'legacy-darkgym',
    name: 'Dark Gym (Legacy)',
    colors: {
      background: '17 17 17',
      foreground: '255 255 255',
      primary: '239 68 68',
      primaryForeground: '255 255 255',
      secondary: '185 28 28',
      accent: '239 68 68',
      muted: '30 30 30',
      border: '239 68 68',
    },
  },
  {
    id: 'legacy-original',
    name: 'Original (Legacy)',
    colors: {
      background: '255 255 255',
      foreground: '0 0 0',
      primary: '59 130 246',
      primaryForeground: '255 255 255',
      secondary: '37 99 235',
      accent: '59 130 246',
      muted: '243 244 246',
      border: '229 231 235',
    },
  },
  {
    id: 'legacy-athletic',
    name: 'Athletic (Legacy)',
    colors: {
      background: '15 23 42',
      foreground: '248 250 252',
      primary: '250 204 21',
      primaryForeground: '0 0 0',
      secondary: '234 179 8',
      accent: '250 204 21',
      muted: '30 41 59',
      border: '250 204 21',
    },
  },
  {
    id: 'legacy-vibrant',
    name: 'Vibrant (Legacy)',
    colors: {
      background: '253 242 248',
      foreground: '157 23 77',
      primary: '236 72 153',
      primaryForeground: '255 255 255',
      secondary: '219 39 119',
      accent: '236 72 153',
      muted: '249 168 212',
      border: '236 72 153',
    },
  },
  {
    id: 'legacy-minimal',
    name: 'Minimal (Legacy)',
    colors: {
      background: '250 250 250',
      foreground: '38 38 38',
      primary: '82 82 82',
      primaryForeground: '255 255 255',
      secondary: '115 115 115',
      accent: '82 82 82',
      muted: '245 245 245',
      border: '212 212 212',
    },
  },
  {
    id: 'legacy-retro',
    name: 'Legacy Retro',
    colors: {
      background: '255 248 225',
      foreground: '101 65 23',
      primary: '249 115 22',
      primaryForeground: '255 255 255',
      secondary: '234 88 12',
      accent: '249 115 22',
      muted: '254 243 199',
      border: '249 115 22',
    },
  },
  {
    id: 'legacy-volcano',
    name: 'Volcano (Legacy)',
    colors: {
      background: '23 16 16',
      foreground: '255 237 213',
      primary: '249 115 22',
      primaryForeground: '255 255 255',
      secondary: '234 88 12',
      accent: '251 146 60',
      muted: '38 28 28',
      border: '249 115 22',
    },
  },
  {
    id: 'legacy-matrix',
    name: 'Matrix (Legacy)',
    colors: {
      background: '0 10 0',
      foreground: '0 255 65',
      primary: '0 255 65',
      primaryForeground: '0 0 0',
      secondary: '0 200 50',
      accent: '0 255 65',
      muted: '0 20 5',
      border: '0 255 65',
    },
  },
  {
    id: 'legacy-cosmic',
    name: 'Cosmic (Legacy)',
    colors: {
      background: '10 10 30',
      foreground: '220 220 255',
      primary: '139 92 246',
      primaryForeground: '255 255 255',
      secondary: '124 58 237',
      accent: '167 139 250',
      muted: '20 20 50',
      border: '139 92 246',
    },
  },
  {
    id: 'legacy-cherry',
    name: 'Cherry (Legacy)',
    colors: {
      background: '30 10 15',
      foreground: '255 228 230',
      primary: '244 63 94',
      primaryForeground: '255 255 255',
      secondary: '225 29 72',
      accent: '251 113 133',
      muted: '50 20 30',
      border: '244 63 94',
    },
  },
  {
    id: 'legacy-slate',
    name: 'Slate (Legacy)',
    colors: {
      background: '248 250 252',
      foreground: '15 23 42',
      primary: '100 116 139',
      primaryForeground: '255 255 255',
      secondary: '71 85 105',
      accent: '100 116 139',
      muted: '226 232 240',
      border: '203 213 225',
    },
  },
];

export function getThemeById(id: string): Theme | undefined {
  return themes.find((t) => t.id === id);
}

export const defaultTheme = themes.find(t => t.id === 'legacy-original') || themes[0];
