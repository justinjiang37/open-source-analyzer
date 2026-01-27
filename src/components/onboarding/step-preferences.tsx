"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/mock-data";
import { TOTAL_STEPS, TIME_BUDGETS, REJECTION_TOLERANCES } from "@/lib/onboarding";
import { OnboardingNav } from "./onboarding-nav";
import { Clock, ThumbsDown } from "lucide-react";

interface StepPreferencesProps {
  profile: User;
  currentStep: number;
}

export function StepPreferences({ profile, currentStep }: StepPreferencesProps) {
  const router = useRouter();
  const [timeBudget, setTimeBudget] = useState(profile.timeBudget);
  const [rejectionTolerance, setRejectionTolerance] = useState(
    profile.rejectionTolerance
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${profile.githubUsername}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          timeBudget,
          rejectionTolerance,
          onboardingStep: currentStep + 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      router.push(`/onboarding/${currentStep + 1}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);

    try {
      await fetch(`/api/users/${profile.githubUsername}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          onboardingStep: 0,
        }),
      });

      router.push("/profile");
    } catch {
      router.push("/profile");
    }
  };

  const handleBack = () => {
    router.push(`/onboarding/${currentStep - 1}`);
  };

  const getTimeBudgetDescription = (budget: string) => {
    switch (budget) {
      case "Short-term (hours → days)":
        return "Quick wins and small tasks you can complete in a few hours";
      case "Medium (1–2 weeks)":
        return "Medium-sized features or improvements";
      case "Long-term (weeks+)":
        return "Major features or ongoing project involvement";
      default:
        return "";
    }
  };

  const getRejectionToleranceDescription = (tolerance: string) => {
    switch (tolerance) {
      case "Low":
        return "Prefer projects with high PR acceptance rates";
      case "Medium":
        return "Comfortable with some feedback and revision requests";
      case "High":
        return "Open to challenging projects with strict standards";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Your Preferences
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Help us find projects that match your availability and expectations.
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-6">
        {/* Time Budget */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
            <Clock className="size-4" />
            How much time can you dedicate to contributions?
          </label>
          <div className="flex flex-col gap-3">
            {TIME_BUDGETS.map((budget) => (
              <label
                key={budget}
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 dark:has-[:checked]:bg-orange-900/20"
              >
                <input
                  type="radio"
                  name="timeBudget"
                  value={budget}
                  checked={timeBudget === budget}
                  onChange={(e) =>
                    setTimeBudget(e.target.value as typeof timeBudget)
                  }
                  className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full cursor-pointer transition-all duration-200 appearance-none bg-white dark:bg-gray-700 checked:border-orange-500 dark:checked:border-orange-400 checked:bg-white dark:checked:bg-gray-700 checked:shadow-[inset_0_0_0_4px_rgb(249,115,22)] dark:checked:shadow-[inset_0_0_0_4px_rgb(251,146,60)] focus:outline-none focus:ring-2 focus:ring-orange-500/10"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {budget}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getTimeBudgetDescription(budget)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Rejection Tolerance */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
            <ThumbsDown className="size-4" />
            How do you feel about PR rejection or extensive feedback?
          </label>
          <div className="flex flex-col gap-3">
            {REJECTION_TOLERANCES.map((tolerance) => (
              <label
                key={tolerance}
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 dark:has-[:checked]:bg-orange-900/20"
              >
                <input
                  type="radio"
                  name="rejectionTolerance"
                  value={tolerance}
                  checked={rejectionTolerance === tolerance}
                  onChange={(e) =>
                    setRejectionTolerance(
                      e.target.value as typeof rejectionTolerance
                    )
                  }
                  className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full cursor-pointer transition-all duration-200 appearance-none bg-white dark:bg-gray-700 checked:border-orange-500 dark:checked:border-orange-400 checked:bg-white dark:checked:bg-gray-700 checked:shadow-[inset_0_0_0_4px_rgb(249,115,22)] dark:checked:shadow-[inset_0_0_0_4px_rgb(251,146,60)] focus:outline-none focus:ring-2 focus:ring-orange-500/10"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {tolerance}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getRejectionToleranceDescription(tolerance)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      {/* Navigation */}
      <OnboardingNav
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
        isLoading={isLoading}
      />
    </div>
  );
}
