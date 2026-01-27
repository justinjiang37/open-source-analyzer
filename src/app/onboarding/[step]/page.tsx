import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { StepWelcome } from "@/components/onboarding/step-welcome";
import { StepSkills } from "@/components/onboarding/step-skills";
import { StepGoals } from "@/components/onboarding/step-goals";
import { StepPreferences } from "@/components/onboarding/step-preferences";
import { StepComplete } from "@/components/onboarding/step-complete";
import { User } from "@/lib/mock-data";

interface OnboardingStepPageProps {
  params: Promise<{ step: string }>;
}

async function getUserProfile(authId: string): Promise<User | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    githubUsername: data.github_username,
    primaryLanguages: data.primary_languages || [],
    experienceLevel: data.experience_level || "Beginner",
    contributionGoals: data.contribution_goals || [],
    timeBudget: data.time_budget || "Medium (1–2 weeks)",
    rejectionTolerance: data.rejection_tolerance || "Medium",
    preferredContributionTypes: data.preferred_contribution_types || [],
    onboardingStep: data.onboarding_step,
  };
}

export default async function OnboardingStepPage({
  params,
}: OnboardingStepPageProps) {
  const { step } = await params;
  const stepNumber = parseInt(step, 10);

  // Validate step number (1-5)
  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 5) {
    redirect("/onboarding/1");
  }

  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  // Get user profile
  const profile = await getUserProfile(authUser.id);

  if (!profile) {
    // Profile doesn't exist yet - should not happen if auth callback creates it
    redirect("/profile");
  }

  // Render the appropriate step
  return (
    <div className="space-y-8">
      <OnboardingProgress currentStep={stepNumber} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
        {stepNumber === 1 && (
          <StepWelcome profile={profile} currentStep={stepNumber} />
        )}
        {stepNumber === 2 && (
          <StepSkills profile={profile} currentStep={stepNumber} />
        )}
        {stepNumber === 3 && (
          <StepGoals profile={profile} currentStep={stepNumber} />
        )}
        {stepNumber === 4 && (
          <StepPreferences profile={profile} currentStep={stepNumber} />
        )}
        {stepNumber === 5 && (
          <StepComplete profile={profile} currentStep={stepNumber} />
        )}
      </div>
    </div>
  );
}
