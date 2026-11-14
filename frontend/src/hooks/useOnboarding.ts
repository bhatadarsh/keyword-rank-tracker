import { useState, useCallback } from 'react';
import type { OnboardingState } from '../types';

const STORAGE_PROGRESS_KEY = 'nexusrank_onboarding_progress';
const STORAGE_DISMISSED_KEY = 'nexusrank_welcome_dismissed';

const INITIAL_STATE: OnboardingState = {
  demoRun: false,
  opportunitiesViewed: false,
  xrayInspected: false,
};

export function useOnboarding() {
  const [completedSteps, setCompletedSteps] = useState<OnboardingState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROGRESS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_STATE;
    } catch {
      return INITIAL_STATE;
    }
  });

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const markStepComplete = useCallback((step: keyof OnboardingState) => {
    setCompletedSteps((prev) => {
      if (prev[step]) return prev;
      const next = { ...prev, [step]: true };
      try {
        localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const dismissGuide = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const resetGuide = useCallback(() => {
    setCompletedSteps(INITIAL_STATE);
    setIsDismissed(false);
    try {
      localStorage.removeItem(STORAGE_PROGRESS_KEY);
      localStorage.removeItem(STORAGE_DISMISSED_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const isAllCompleted = completedCount === 3;

  return {
    completedSteps,
    isDismissed,
    completedCount,
    isAllCompleted,
    markStepComplete,
    dismissGuide,
    resetGuide,
  };
}
