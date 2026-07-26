"use client";

import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { Check } from "lucide-react";

interface OnboardingProgressProps {
  currentStep: number;
}

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  // Calculate progress percentage for the progress bar
  const progressPercentage = (currentStep / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Animated progress bar showing completion percentage */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-orange-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step indicators - shows checkmarks for completed steps, numbers for current/future */}
      <div className="flex justify-between">
        {ONBOARDING_STEPS.map((step) => (
          <div
            key={step.number}
            className="flex flex-col items-center"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                step.number < currentStep &&
                  "bg-orange-500 text-white",
                step.number === currentStep &&
                  "bg-orange-500 text-white ring-4 ring-orange-200 dark:ring-orange-900",
                step.number > currentStep &&
                  "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              )}
            >
              {step.number < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                "text-xs mt-2 font-medium transition-colors duration-300",
                step.number <= currentStep
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-400 dark:text-gray-500"
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
