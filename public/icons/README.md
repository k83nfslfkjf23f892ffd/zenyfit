# PWA Icons

This directory contains all the Progressive Web App (PWA) icons for ZenyFit.

## Generated Icons

All icons are auto-generated from the source SVG logo (`/public/logo.svg`).

**Icon Sizes:**
- 72x72 - Small Android icon
- 96x96 - Medium Android icon
- 128x128 - Android icon
- 144x144 - Android icon
- 152x152 - iOS icon
- 192x192 - Standard PWA icon
- 384x384 - Large PWA icon
- 512x512 - Splash screen icon

## Regenerating Icons

If you update the logo SVG, regenerate all icons by running:

```bash
npm run generate-icons
```

This will:
1. Convert the SVG to PNG in all required sizes
2. Generate favicon.ico (32x32)
3. Generate apple-touch-icon.png (180x180)

## Logo Design

The ZenyFit logo features:
- **Purple gradient background** (#8B5CF6 to #7C3AED)
- **White dumbbell icon** - represents fitness/strength
- **Yellow lightning bolt** - represents energy/XP/gamification
- **"ZF" text** - ZenyFit abbreviation

## Icon Purpose

- `icon-192x192.png` - Used as the main app icon when installed
- `icon-512x512.png` - Used for splash screens and high-DPI displays
- Smaller sizes (72x72 to 152x152) - Used for various device sizes
- All icons support "maskable" mode for Android adaptive icons

## Browser Support

These icons work with:
- Chrome/Edge (desktop & mobile)
- Safari (iOS & macOS)
- Firefox (desktop & mobile)
- Samsung Internet
- All PWA-compatible browsers

## Installation

When users install ZenyFit as a PWA:
1. The 192x192 or 512x512 icon appears on their home screen
2. The splash screen shows the 512x512 icon
3. The browser tab shows favicon.ico
4. iOS devices use apple-touch-icon.png
