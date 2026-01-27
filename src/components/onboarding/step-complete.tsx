"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/mock-data";
import { TOTAL_STEPS } from "@/lib/onboarding";
import { OnboardingNav } from "./onboarding-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle,
  User as UserIcon,
  Code,
  Target,
  Clock,
  ThumbsDown,
  FileText,
} from "lucide-react";

interface StepCompleteProps {
  profile: User;
  currentStep: number;
}

export function StepComplete({ profile, currentStep }: StepCompleteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleFinish = async () => {
    setIsLoading(true);

    try {
      // Mark onboarding as complete (set to null)
      await fetch(`/api/users/${profile.githubUsername}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          onboardingStep: null, // null = completed
        }),
      });

      router.push("/explore");
    } catch {
      // Still redirect even if save fails
      router.push("/explore");
    }
  };

  const handleBack = () => {
    router.push(`/onboarding/${currentStep - 1}`);
  };

  const handleSkip = () => {
    // No skip on final step
    handleFinish();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          You&apos;re all set!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here&apos;s a summary of your profile. You can always edit this later.
        </p>
      </div>

      {/* Profile Summary */}
      <div className="space-y-6">
        {/* User info */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Avatar className="size-16 ring-4 ring-orange-100 dark:ring-orange-900">
            <AvatarImage src={profile.avatarUrl} alt={profile.name} />
            <AvatarFallback className="bg-orange-500 text-white text-xl font-semibold">
              {profile.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {profile.name}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              @{profile.githubUsername}
            </p>
            {profile.bio && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Languages */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Code className="size-4" />
              Languages
            </div>
            {profile.primaryLanguages.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.primaryLanguages.map((lang, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 italic text-sm">Not specified</span>
            )}
          </div>

          {/* Experience */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Target className="size-4" />
              Experience Level
            </div>
            <span className="text-gray-900 dark:text-gray-100">
              {profile.experienceLevel}
            </span>
          </div>

          {/* Goals */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <UserIcon className="size-4" />
              Contribution Goals
            </div>
            {profile.contributionGoals.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.contributionGoals.map((goal, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                  >
                    {goal}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 italic text-sm">Not specified</span>
            )}
          </div>

          {/* Contribution Types */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="size-4" />
              Preferred Contributions
            </div>
            {profile.preferredContributionTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.preferredContributionTypes.map((type, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                  >
                    {type}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 italic text-sm">Not specified</span>
            )}
          </div>

          {/* Time Budget */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="size-4" />
              Time Budget
            </div>
            <span className="text-gray-900 dark:text-gray-100">
              {profile.timeBudget}
            </span>
          </div>

          {/* Rejection Tolerance */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <ThumbsDown className="size-4" />
              PR Feedback Tolerance
            </div>
            <span className="text-gray-900 dark:text-gray-100">
              {profile.rejectionTolerance}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <OnboardingNav
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        onNext={handleFinish}
        onBack={handleBack}
        onSkip={handleSkip}
        isLoading={isLoading}
      />
    </div>
  );
}
