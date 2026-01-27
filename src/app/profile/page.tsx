/**
 * Profile Page
 *
 * Shows the authenticated user's profile.
 * - If not logged in: prompts to sign in
 * - If logged in but no profile: creates one from GitHub data
 * - If logged in with profile: shows their saved profile
 */

import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { createClient } from "@/lib/supabase/server";
import { User } from "@/lib/mock-data";

async function getOrCreateProfile(
  authId: string,
  githubUsername: string,
  githubData: { name: string; avatarUrl: string }
): Promise<User> {
  const supabase = await createClient();

  // Try to fetch existing profile (by auth_id or github_username)
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .or(`auth_id.eq.${authId},github_username.eq.${githubUsername}`)
    .single();

  if (existingUser) {
    // If existing user doesn't have auth_id, update it (migration case)
    if (!existingUser.auth_id) {
      await supabase
        .from("users")
        .update({ auth_id: authId })
        .eq("id", existingUser.id);
    }

    // Return existing profile (transformed to camelCase)
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
    };
  }

  // No profile exists - create one with defaults from GitHub
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
  };

  const { data: createdUser, error } = await supabase
    .from("users")
    .insert(newProfile)
    .select()
    .single();

  if (error || !createdUser) {
    // If insert fails (e.g., RLS), return a default object
    // The user can still edit, and it will be saved on next attempt
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
    };
  }

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
  };
}

export default async function ProfilePage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    // Not logged in - redirect to home (or could show a sign-in prompt)
    redirect("/");
  }

  // Get GitHub data from auth metadata
  const githubUsername = authUser.user_metadata?.user_name || authUser.user_metadata?.preferred_username;
  const githubName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
  const githubAvatar = authUser.user_metadata?.avatar_url;

  if (!githubUsername) {
    // Edge case: no GitHub username in metadata
    redirect("/");
  }

  // Get or create the user's profile
  const user = await getOrCreateProfile(authUser.id, githubUsername, {
    name: githubName,
    avatarUrl: githubAvatar,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-8">
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
