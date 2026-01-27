"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/mock-data";
import { TOTAL_STEPS, CONTRIBUTION_GOALS, CONTRIBUTION_TYPES } from "@/lib/onboarding";
import { OnboardingNav } from "./onboarding-nav";
import { Target, FileText } from "lucide-react";

interface StepGoalsProps {
  profile: User;
  currentStep: number;
}

export function StepGoals({ profile, currentStep }: StepGoalsProps) {
  const router = useRouter();
  const [contributionGoals, setContributionGoals] = useState<string[]>(
    profile.contributionGoals
  );
  const [preferredContributionTypes, setPreferredContributionTypes] = useState<
    string[]
  >(profile.preferredContributionTypes);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGoal = (goal: string) => {
    setContributionGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const toggleType = (type: string) => {
    setPreferredContributionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleNext = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${profile.githubUsername}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          contributionGoals,
          preferredContributionTypes,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Your Contribution Goals
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          What are you hoping to achieve through open source contributions?
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-6">
        {/* Contribution Goals */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
            <Target className="size-4" />
            Why do you want to contribute? (Select all that apply)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONTRIBUTION_GOALS.map((goal) => (
              <label
                key={goal}
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 dark:has-[:checked]:bg-orange-900/20"
              >
                <input
                  type="checkbox"
                  checked={contributionGoals.includes(goal)}
                  onChange={() => toggleGoal(goal)}
                  className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded cursor-pointer transition-all duration-200 appearance-none bg-white dark:bg-gray-700 checked:bg-orange-500 dark:checked:bg-orange-500 checked:border-orange-500 dark:checked:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10"
                  style={{
                    backgroundImage: contributionGoals.includes(goal)
                      ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M10 3L4.5 8.5L2 6'/%3E%3C/svg%3E\")"
                      : undefined,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                  }}
                />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {goal}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Preferred Contribution Types */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
            <FileText className="size-4" />
            What types of contributions interest you? (Select all that apply)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONTRIBUTION_TYPES.map((type) => (
              <label
                key={type}
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 dark:has-[:checked]:bg-orange-900/20"
              >
                <input
                  type="checkbox"
                  checked={preferredContributionTypes.includes(type)}
                  onChange={() => toggleType(type)}
                  className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded cursor-pointer transition-all duration-200 appearance-none bg-white dark:bg-gray-700 checked:bg-orange-500 dark:checked:bg-orange-500 checked:border-orange-500 dark:checked:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10"
                  style={{
                    backgroundImage: preferredContributionTypes.includes(type)
                      ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M10 3L4.5 8.5L2 6'/%3E%3C/svg%3E\")"
                      : undefined,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                  }}
                />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {type}
                </span>
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
