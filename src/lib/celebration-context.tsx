'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { LevelUpCelebration } from '@/components/animations/LevelUpCelebration';
import { WorkoutCelebration } from '@/components/animations/WorkoutCelebration';
import { AchievementUnlock } from '@/components/animations/AchievementUnlock';
import { useAuth } from './auth-context';

interface CelebrationContextType {
  showLevelUp: (newLevel: number) => void;
  showWorkoutComplete: (xpGained: number, exerciseType: string, amount: number) => void;
  showAchievement: (title: string, description: string, icon?: React.ReactNode) => void;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const { setOnLevelUpCallback } = useAuth();
  const [levelUpState, setLevelUpState] = useState<{
    isVisible: boolean;
    level: number;
  }>({
    isVisible: false,
    level: 1,
  });

  const [workoutState, setWorkoutState] = useState<{
    isVisible: boolean;
    xpGained: number;
    exerciseType: string;
    amount: number;
  }>({
    isVisible: false,
    xpGained: 0,
    exerciseType: '',
    amount: 0,
  });

  const [achievementState, setAchievementState] = useState<{
    isVisible: boolean;
    title: string;
    description: string;
    icon?: React.ReactNode;
  }>({
    isVisible: false,
    title: '',
    description: '',
  });

  const showLevelUp = useCallback((newLevel: number) => {
    setLevelUpState({ isVisible: true, level: newLevel });
  }, []);

  const showWorkoutComplete = useCallback(
    (xpGained: number, exerciseType: string, amount: number) => {
      setWorkoutState({ isVisible: true, xpGained, exerciseType, amount });
    },
    []
  );

  const showAchievement = useCallback(
    (title: string, description: string, icon?: React.ReactNode) => {
      setAchievementState({ isVisible: true, title, description, icon });
    },
    []
  );

  // Memoized close handlers to prevent useEffect re-runs in celebration components
  const closeLevelUp = useCallback(() => {
    setLevelUpState((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const closeWorkout = useCallback(() => {
    setWorkoutState((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const closeAchievement = useCallback(() => {
    setAchievementState((prev) => ({ ...prev, isVisible: false }));
  }, []);

  // Connect level-up detection from auth context
  useEffect(() => {
    if (setOnLevelUpCallback) {
      setOnLevelUpCallback((newLevel: number) => {
        showLevelUp(newLevel);
      });
    }
  }, [setOnLevelUpCallback, showLevelUp]);

  return (
    <CelebrationContext.Provider
      value={{ showLevelUp, showWorkoutComplete, showAchievement }}
    >
      {children}

      {/* Celebration components */}
      <LevelUpCelebration
        isVisible={levelUpState.isVisible}
        newLevel={levelUpState.level}
        onClose={closeLevelUp}
      />

      <WorkoutCelebration
        isVisible={workoutState.isVisible}
        xpGained={workoutState.xpGained}
        exerciseType={workoutState.exerciseType}
        amount={workoutState.amount}
        onClose={closeWorkout}
      />

      <AchievementUnlock
        isVisible={achievementState.isVisible}
        title={achievementState.title}
        description={achievementState.description}
        icon={achievementState.icon}
        onClose={closeAchievement}
      />
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (context === undefined) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
}
