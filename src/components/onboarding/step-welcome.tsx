"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/mock-data";
import { TOTAL_STEPS } from "@/lib/onboarding";
import { OnboardingNav } from "./onboarding-nav";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, FileText } from "lucide-react";

interface StepWelcomeProps {
  profile: User;
  currentStep: number;
}

// Onboarding step 1: collect display name + bio.
export function StepWelcome({ profile, currentStep }: StepWelcomeProps) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          name,
          bio,
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
          onboardingStep: 0, // Mark as skipped
        }),
      });

      router.push("/profile");
    } catch {
      router.push("/profile");
    }
  };

  const handleBack = () => {
    // No back on step 1
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome to OSS Analyzer
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Let&apos;s set up your profile to help you find the perfect open source
          projects to contribute to.
        </p>
      </div>

      {/* Avatar preview */}
      <div className="flex justify-center">
        <Avatar className="size-20 ring-4 ring-orange-100 dark:ring-orange-900">
          <AvatarImage src={profile.avatarUrl} alt={name} />
          <AvatarFallback className="bg-orange-500 text-white text-xl font-semibold">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Form fields */}
      <div className="space-y-6">
        {/* Name Field */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
            <UserIcon className="size-4" />
            Display Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This is how you&apos;ll appear on the platform
          </p>
        </div>

        {/* Bio Field */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
            <FileText className="size-4" />
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself and your interests in open source"
            className="min-h-[120px] w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 outline-none resize-y focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 dark:focus:ring-orange-400/10"
          />
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
        canProceed={name.trim().length > 0}
      />
    </div>
  );
}
