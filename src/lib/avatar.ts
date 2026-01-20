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

// Popular avatar styles for fitness
export const FITNESS_AVATAR_STYLES: AvatarStyle[] = [
  'bottts',       // Robot style (gamification feel)
  'pixel-art',    // Retro gaming style
  'adventurer',   // Cartoon people
  'lorelei',      // Simple faces
  'miniavs',      // Minimal avatars
  'personas',     // Modern people
  'fun-emoji',    // Emoji style
  'shapes',       // Geometric
];

// Get random fitness avatar with truly unique seed
export function getRandomFitnessAvatar(): string {
  const randomStyle = FITNESS_AVATAR_STYLES[
    Math.floor(Math.random() * FITNESS_AVATAR_STYLES.length)
  ];
  // Generate a random seed for a truly unique avatar each time
  const randomSeed = Math.random().toString(36).substring(2) + Date.now().toString(36);
  return generateAvatarUrl(randomSeed, randomStyle);
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
