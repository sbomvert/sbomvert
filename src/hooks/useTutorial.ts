
import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================
// Tutorial Hook
// ============================================================
export interface TutorialStep {
  title: string;
  description: string;
  target?: string | null;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export function useTutorial(steps: TutorialStep[], tutorialKey: string = 'hasSeenTutorial') {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(tutorialKey);
    if (!hasSeenTutorial) {
      setIsActive(true);
    }
  }, [tutorialKey]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };

  const skipTutorial = () => {
    localStorage.setItem(tutorialKey, 'true');
    setIsActive(false);
  };

  const completeTutorial = () => {
    localStorage.setItem(tutorialKey, 'true');
    setIsActive(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem(tutorialKey);
    setCurrentStep(0);
    setIsActive(true);
  };

  return {
    currentStep,
    isActive,
    step: steps[currentStep],
    totalSteps: steps.length,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    nextStep,
    prevStep,
    goToStep,
    skipTutorial,
    completeTutorial,
    resetTutorial,
  };
}