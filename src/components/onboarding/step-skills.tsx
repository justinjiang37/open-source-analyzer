"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/mock-data";
import { TOTAL_STEPS, EXPERIENCE_LEVELS } from "@/lib/onboarding";
import { OnboardingNav } from "./onboarding-nav";
import { Input } from "@/components/ui/input";
import { Code, Target } from "lucide-react";

interface StepSkillsProps {
  profile: User;
  currentStep: number;
}

// Onboarding step 2: collect primary languages + experience level.
export function StepSkills({ profile, currentStep }: StepSkillsProps) {
  const router = useRouter();
  // Store raw input value to allow typing commas
  const [languageInput, setLanguageInput] = useState(
    profile.primaryLanguages.join(", ")
  );
  const [experienceLevel, setExperienceLevel] = useState(
    profile.experienceLevel
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse comma-separated languages input (max 3).
  const getParsedLanguages = () => {
    return languageInput
      .split(",")
      .map((lang) => lang.trim())
      .filter((lang) => lang.length > 0)
      .slice(0, 3);
  };

  // Save step data to the user's profile, then navigate to the next step.
  const handleNext = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${profile.githubUsername}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          primaryLanguages: getParsedLanguages(),
          experienceLevel,
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

  // Skip onboarding (set onboardingStep to 0) and go to profile page.
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
          Your Technical Skills
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Help us match you with projects that fit your expertise.
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-6">
        {/* Primary Languages */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
            <Code className="size-4" />
            Primary Programming Languages
          </label>
          <Input
            value={languageInput}
            onChange={(e) => setLanguageInput(e.target.value)}
            placeholder="e.g., JavaScript, Python, Go"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter 1-3 languages, comma-separated, from most to least familiar
          </p>

          {/* Language preview */}
          {getParsedLanguages().length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {getParsedLanguages().map((lang, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 rounded-lg"
                >
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Experience Level */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
            <Target className="size-4" />
            Experience Level
          </label>
          <div className="flex flex-col gap-3">
            {EXPERIENCE_LEVELS.map((level) => (
              <label
                key={level}
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 dark:has-[:checked]:bg-orange-900/20"
              >
                <input
                  type="radio"
                  name="experience"
                  value={level}
                  checked={experienceLevel === level}
                  onChange={(e) =>
                    setExperienceLevel(
                      e.target.value as typeof experienceLevel
                    )
                  }
                  className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full cursor-pointer transition-all duration-200 appearance-none bg-white dark:bg-gray-700 checked:border-orange-500 dark:checked:border-orange-400 checked:bg-white dark:checked:bg-gray-700 checked:shadow-[inset_0_0_0_4px_rgb(249,115,22)] dark:checked:shadow-[inset_0_0_0_4px_rgb(251,146,60)] focus:outline-none focus:ring-2 focus:ring-orange-500/10"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {level}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {level === "Beginner" &&
                      "New to open source contributions"}
                    {level === "Intermediate" &&
                      "Some experience with pull requests and code reviews"}
                    {level === "Advanced" &&
                      "Regular contributor to multiple projects"}
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
