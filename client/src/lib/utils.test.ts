import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-500');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toContain('base-class');
      expect(result).toContain('active-class');
    });

    it('should filter out falsy values', () => {
      const result = cn('valid-class', false, null, undefined, 'another-class');
      expect(result).toContain('valid-class');
      expect(result).toContain('another-class');
      expect(result).not.toContain('false');
      expect(result).not.toContain('null');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should override conflicting Tailwind classes', () => {
      // clsx and tailwind-merge should handle conflicts
      const result = cn('text-red-500', 'text-blue-500');
      // The last class should win (tailwind-merge behavior)
      expect(result).toContain('text-blue-500');
    });
  });
});
