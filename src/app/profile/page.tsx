/**
 * Profile Page
 *
 * Fetches user from database if they exist, otherwise shows mock data.
 * Once saved, subsequent visits will load from the database.
 *
 * Note: Without auth, we use a hardcoded username (from mockUser).
 * When auth is added, this will use the authenticated user's ID.
 */

import { ProfileForm } from "@/components/profile-form";
import { mockUser } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";

async function getUser(githubUsername: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("github_username", githubUsername)
    .single();

  if (error || !data) {
    return null;
  }

  // Transform snake_case to camelCase
  return {
    id: data.id,
    name: data.name,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    githubUsername: data.github_username,
    primaryLanguages: data.primary_languages,
    experienceLevel: data.experience_level,
    contributionGoals: data.contribution_goals,
    timeBudget: data.time_budget,
    rejectionTolerance: data.rejection_tolerance,
    preferredContributionTypes: data.preferred_contribution_types,
  };
}

export default async function ProfilePage() {
  // Try to fetch from database, fall back to mock data
  // Note: Replace mockUser.githubUsername with auth user when auth is added
  const user = (await getUser(mockUser.githubUsername)) || mockUser;

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
