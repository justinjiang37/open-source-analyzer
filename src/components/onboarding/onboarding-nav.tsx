"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface OnboardingNavProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isLoading?: boolean;
  canProceed?: boolean;
}

export function OnboardingNav({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  isLoading = false,
  canProceed = true,
}: OnboardingNavProps) {
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
      <div>
        {currentStep > 1 && (
          <Button variant="ghost" onClick={onBack} disabled={isLoading}>
            Back
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        {!isLastStep && (
          <Button variant="ghost" onClick={onSkip} disabled={isLoading}>
            Skip for now
          </Button>
        )}
        <Button
          variant="accent"
          onClick={onNext}
          disabled={isLoading || !canProceed}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isLastStep ? (
            "Get Started"
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
