import { describe, it, expect } from 'vitest';

// Helper functions from use-auth hook
function calculateLevel(xp: number): number {
  const fixedThresholds = [0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000, 30000];

  for (let i = fixedThresholds.length - 1; i >= 0; i--) {
    if (xp >= fixedThresholds[i]) {
      if (i === fixedThresholds.length - 1) {
        const additionalXP = xp - fixedThresholds[i];
        const additionalLevels = Math.floor(additionalXP / 7000);
        return i + 1 + additionalLevels;
      }
      return i + 1;
    }
  }

  return 1;
}

function getXPForNextLevel(currentLevel: number): number {
  const fixedThresholds = [0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000, 30000];

  if (currentLevel < fixedThresholds.length) {
    return fixedThresholds[currentLevel];
  }

  return fixedThresholds[fixedThresholds.length - 1] + ((currentLevel - fixedThresholds.length + 1) * 7000);
}

describe('useAuth level calculations', () => {
  describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should return level 1 for XP below 500', () => {
      expect(calculateLevel(100)).toBe(1);
      expect(calculateLevel(499)).toBe(1);
    });

    it('should return level 2 for 500 XP', () => {
      expect(calculateLevel(500)).toBe(2);
    });

    it('should return level 3 for 1500 XP', () => {
      expect(calculateLevel(1500)).toBe(3);
    });

    it('should return level 10 for 30000 XP', () => {
      expect(calculateLevel(30000)).toBe(10);
    });

    it('should calculate levels beyond 10 correctly', () => {
      // Level 11 = 30000 + 7000 = 37000
      expect(calculateLevel(37000)).toBe(11);
      // Level 12 = 30000 + 14000 = 44000
      expect(calculateLevel(44000)).toBe(12);
      // Level 20 = 30000 + (10 * 7000) = 100000
      expect(calculateLevel(100000)).toBe(20);
    });

    it('should handle large XP values', () => {
      // Level 50 = 30000 + (40 * 7000) = 310000
      expect(calculateLevel(310000)).toBe(50);
    });
  });

  describe('getXPForNextLevel', () => {
    it('should return correct thresholds for early levels', () => {
      expect(getXPForNextLevel(1)).toBe(500);
      expect(getXPForNextLevel(2)).toBe(1500);
      expect(getXPForNextLevel(3)).toBe(3000);
    });

    it('should return correct threshold for level 10', () => {
      expect(getXPForNextLevel(9)).toBe(30000);
    });

    it('should calculate thresholds for levels beyond 10', () => {
      // Level 11 needs 37000 XP
      expect(getXPForNextLevel(10)).toBe(37000);
      // Level 12 needs 44000 XP
      expect(getXPForNextLevel(11)).toBe(44000);
    });

    it('should handle high levels', () => {
      // Level 50 needs 310000 XP
      expect(getXPForNextLevel(49)).toBe(310000);
    });
  });

  describe('level and XP consistency', () => {
    it('should have consistent level calculation and threshold', () => {
      // If you have exact XP for a level, calculateLevel should return that level
      // and getXPForNextLevel should give the next threshold

      const testCases = [
        { xp: 500, expectedLevel: 2, nextLevelXP: 1500 },
        { xp: 1500, expectedLevel: 3, nextLevelXP: 3000 },
        { xp: 30000, expectedLevel: 10, nextLevelXP: 37000 },
        { xp: 37000, expectedLevel: 11, nextLevelXP: 44000 },
      ];

      testCases.forEach(({ xp, expectedLevel, nextLevelXP }) => {
        const level = calculateLevel(xp);
        expect(level).toBe(expectedLevel);
        expect(getXPForNextLevel(level)).toBe(nextLevelXP);
      });
    });
  });
});
