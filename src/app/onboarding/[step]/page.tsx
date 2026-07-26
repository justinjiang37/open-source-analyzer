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

// Load the current user's profile from the DB (by auth user id)
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

/**
 * Dynamic onboarding step page: `/onboarding/[step]` (e.g. /onboarding/1).
 *
 * Runs on the server to:
 * - validate the step number
 * - enforce authentication
 * - load the user's profile
 * - render the correct step UI component
 */
export default async function OnboardingStepPage({
  params,
}: OnboardingStepPageProps) {
  // Read the dynamic route param (e.g. "3" from /onboarding/3)
  const { step } = await params;
  const stepNumber = parseInt(step, 10);

  // Guard: invalid step -> go back to step 1
  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 5) {
    redirect("/onboarding/1");
  }

  // Server-side Supabase client (reads auth cookies from the request)
  const supabase = await createClient();

  // Auth guard: if not logged in, send to home
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  // Load the user's saved onboarding/profile data
  const profile = await getUserProfile(authUser.id);

  if (!profile) {
    // Safety fallback: if profile doesn't exist, send them to profile page
    redirect("/profile");
  }

  // Render the progress UI + the correct step component
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
