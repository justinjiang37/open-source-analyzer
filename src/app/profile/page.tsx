/**
 * Profile Page
 *
 * Shows the authenticated user's profile.
 * - If not logged in: prompts to sign in
 * - If logged in but no profile: creates one from GitHub data
 * - If logged in with profile: shows their saved profile
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";
import { createClient } from "@/lib/supabase/server";
import { User } from "@/lib/mock-data";
import { AlertCircle } from "lucide-react";

// Load the user's profile row if it exists; otherwise create a default one.
async function getOrCreateProfile(
  authId: string,
  githubUsername: string,
  githubData: { name: string; avatarUrl: string }
): Promise<User> {
  const supabase = await createClient();

  // Look for an existing profile (supports legacy rows missing auth_id).
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .or(`auth_id.eq.${authId},github_username.eq.${githubUsername}`)
    .single();

  if (existingUser) {
    // Migration helper: backfill auth_id on older rows.
    if (!existingUser.auth_id) {
      await supabase
        .from("users")
        .update({ auth_id: authId })
        .eq("id", existingUser.id);
    }

    // Convert DB snake_case to app camelCase shape.
    return {
      id: existingUser.id,
      name: existingUser.name,
      bio: existingUser.bio,
      avatarUrl: existingUser.avatar_url,
      githubUsername: existingUser.github_username,
      primaryLanguages: existingUser.primary_languages,
      experienceLevel: existingUser.experience_level,
      contributionGoals: existingUser.contribution_goals,
      timeBudget: existingUser.time_budget,
      rejectionTolerance: existingUser.rejection_tolerance,
      preferredContributionTypes: existingUser.preferred_contribution_types,
      onboardingStep: existingUser.onboarding_step,
    };
  }

  // No profile exists yet: create a default one from GitHub OAuth metadata.
  const newProfile = {
    auth_id: authId, // Link to Supabase Auth user
    name: githubData.name || githubUsername,
    bio: "",
    avatar_url: githubData.avatarUrl,
    github_username: githubUsername,
    primary_languages: [],
    experience_level: "Beginner",
    contribution_goals: [],
    time_budget: "Medium (1–2 weeks)",
    rejection_tolerance: "Medium",
    preferred_contribution_types: [],
    onboarding_step: 1, // Start at step 1 for new users
  };

  // Insert and return the created row.
  const { data: createdUser, error } = await supabase
    .from("users")
    .insert(newProfile)
    .select()
    .single();

  if (error || !createdUser) {
    // If insert fails, still return a usable default object for the UI.
    return {
      id: "",
      name: githubData.name || githubUsername,
      bio: "",
      avatarUrl: githubData.avatarUrl,
      githubUsername: githubUsername,
      primaryLanguages: [],
      experienceLevel: "Beginner",
      contributionGoals: [],
      timeBudget: "Medium (1–2 weeks)",
      rejectionTolerance: "Medium",
      preferredContributionTypes: [],
      onboardingStep: null,
    };
  }

  // Convert DB snake_case to app camelCase shape.
  return {
    id: createdUser.id,
    name: createdUser.name,
    bio: createdUser.bio,
    avatarUrl: createdUser.avatar_url,
    githubUsername: createdUser.github_username,
    primaryLanguages: createdUser.primary_languages,
    experienceLevel: createdUser.experience_level,
    contributionGoals: createdUser.contribution_goals,
    timeBudget: createdUser.time_budget,
    rejectionTolerance: createdUser.rejection_tolerance,
    preferredContributionTypes: createdUser.preferred_contribution_types,
    onboardingStep: createdUser.onboarding_step,
  };
}

export default async function ProfilePage() {
  // Server-side auth check (redirect away if not logged in).
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    // Not logged in - redirect to home (or could show a sign-in prompt)
    redirect("/");
  }

  // Pull GitHub identity info from the auth session (OAuth metadata).
  const githubUsername = authUser.user_metadata?.user_name || authUser.user_metadata?.preferred_username;
  const githubName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
  const githubAvatar = authUser.user_metadata?.avatar_url;

  if (!githubUsername) {
    // Edge case: no GitHub username in metadata
    redirect("/");
  }

  // Ensure the user has a profile row in our DB.
  const user = await getOrCreateProfile(authUser.id, githubUsername, {
    name: githubName,
    avatarUrl: githubAvatar,
  });

  // Show a banner if the user skipped onboarding (onboardingStep === 0).
  const showCompleteProfileBanner = user.onboardingStep === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Complete Profile Banner */}
        {showCompleteProfileBanner && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-orange-800 dark:text-orange-200 font-medium">
                Complete your profile
              </p>
              <p className="text-orange-700 dark:text-orange-300 text-sm mt-1">
                You skipped onboarding.{" "}
                <Link
                  href="/onboarding/1"
                  className="font-medium underline hover:no-underline"
                >
                  Complete your profile
                </Link>{" "}
                to get better project recommendations.
              </p>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-950 dark:text-blue-100 mb-2">
            Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <ProfileForm initialUser={user} />
      </div>
    </div>
  );
}
