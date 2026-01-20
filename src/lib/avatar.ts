/**
 * Avatar utilities for ZenyFit
 *
 * Integrates with DiceBear API for generated avatars
 * Supports custom avatar URLs
 */

// DiceBear avatar styles
export type AvatarStyle =
  | 'adventurer'
  | 'adventurer-neutral'
  | 'avataaars'
  | 'big-ears'
  | 'big-smile'
  | 'bottts'
  | 'croodles'
  | 'fun-emoji'
  | 'icons'
  | 'identicon'
  | 'initials'
  | 'lorelei'
  | 'micah'
  | 'miniavs'
  | 'notionists'
  | 'open-peeps'
  | 'personas'
  | 'pixel-art'
  | 'shapes'
  | 'thumbs';

// Default style for fitness app
export const DEFAULT_AVATAR_STYLE: AvatarStyle = 'bottts';

// Generate avatar URL from DiceBear API
export function generateAvatarUrl(
  seed: string,
  style: AvatarStyle = DEFAULT_AVATAR_STYLE,
  options: {
    size?: number;
    backgroundColor?: string;
    radius?: number;
  } = {}
): string {
  const { size = 200, backgroundColor, radius = 50 } = options;

  const params = new URLSearchParams({
    seed,
    size: size.toString(),
    radius: radius.toString(),
  });

  if (backgroundColor) {
    params.append('backgroundColor', backgroundColor);
  }

  return `https://api.dicebear.com/7.x/${style}/svg?${params.toString()}`;
}

// Generate avatar for username
export function getUserAvatar(username: string, style?: AvatarStyle): string {
  return generateAvatarUrl(username, style);
}

// Get avatar initials (fallback)
export function getAvatarInitials(username: string): string {
  if (!username) return '?';

  const parts = username.trim().split(/\s+/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return username.substring(0, 2).toUpperCase();
}

// All available DiceBear avatar styles
export const ALL_AVATAR_STYLES: AvatarStyle[] = [
  'adventurer',
  'adventurer-neutral',
  'avataaars',
  'big-ears',
  'big-smile',
  'bottts',
  'croodles',
  'fun-emoji',
  'icons',
  'identicon',
  'initials',
  'lorelei',
  'micah',
  'miniavs',
  'notionists',
  'open-peeps',
  'personas',
  'pixel-art',
  'shapes',
  'thumbs',
];

// Get random avatar with truly unique seed (uses all styles)
export function getRandomFitnessAvatar(): string {
  const randomStyle = ALL_AVATAR_STYLES[
    Math.floor(Math.random() * ALL_AVATAR_STYLES.length)
  ];
  // Generate a random seed for a truly unique avatar each time
  const randomSeed = Math.random().toString(36).substring(2) + Date.now().toString(36);
  return generateAvatarUrl(randomSeed, randomStyle);
}

// Parse a DiceBear URL to extract style and seed
export function parseDiceBearUrl(url: string): { style: AvatarStyle; seed: string } | null {
  try {
    const match = url.match(/dicebear\.com\/[\d.]+x\/([^/]+)\/svg\?(.+)/);
    if (!match) return null;

    const style = match[1] as AvatarStyle;
    const params = new URLSearchParams(match[2]);
    const seed = params.get('seed') || '';

    if (!ALL_AVATAR_STYLES.includes(style)) return null;

    return { style, seed };
  } catch {
    return null;
  }
}

// Get avatar with same seed but different style
export function getAvatarWithNewStyle(currentUrl: string): string {
  const parsed = parseDiceBearUrl(currentUrl);
  if (!parsed) return getRandomFitnessAvatar();

  // Pick a different random style
  const otherStyles = ALL_AVATAR_STYLES.filter(s => s !== parsed.style);
  const newStyle = otherStyles[Math.floor(Math.random() * otherStyles.length)];

  return generateAvatarUrl(parsed.seed, newStyle);
}

// Get avatar with same style but different seed
export function getAvatarWithNewSeed(currentUrl: string): string {
  const parsed = parseDiceBearUrl(currentUrl);
  if (!parsed) return getRandomFitnessAvatar();

  const newSeed = Math.random().toString(36).substring(2) + Date.now().toString(36);
  return generateAvatarUrl(newSeed, parsed.style);
}

// Random background colors
const BACKGROUND_COLORS = [
  'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf',
  'f4d9b0', 'c9e4ca', 'a8d5ba', 'ffc8dd', 'bde0fe',
  'transparent',
];

// Get avatar with different background color
export function getAvatarWithNewColor(currentUrl: string): string {
  const parsed = parseDiceBearUrl(currentUrl);
  if (!parsed) return getRandomFitnessAvatar();

  const newColor = BACKGROUND_COLORS[Math.floor(Math.random() * BACKGROUND_COLORS.length)];
  return generateAvatarUrl(parsed.seed, parsed.style, { backgroundColor: newColor });
}

// Validate avatar URL
export function isValidAvatarUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Get avatar display URL (with fallback)
export function getAvatarDisplayUrl(
  avatar: string | null | undefined,
  username: string,
  style?: AvatarStyle
): string {
  if (avatar && isValidAvatarUrl(avatar)) {
    return avatar;
  }

  return getUserAvatar(username, style);
}
