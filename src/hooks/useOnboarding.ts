'use client';

import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'scenescout-onboarding-completed';

export interface OnboardingState {
  isCompleted: boolean;
  currentStep: number;
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    isCompleted: true, // Default to true to avoid flash
    currentStep: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if onboarding has been completed
    const completed = localStorage.getItem(ONBOARDING_KEY) === 'true';
    setState({
      isCompleted: completed,
      currentStep: completed ? 3 : 0,
    });
    setIsLoading(false);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setState({
      isCompleted: true,
      currentStep: 3,
    });
  };

  const nextStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 2),
    }));
  };

  const previousStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  return {
    ...state,
    isLoading,
    completeOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
  };
}
