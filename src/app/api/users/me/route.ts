/**
 * Current User API Route - GET /api/users/me
 *
 * Returns the authenticated user's profile.
 * Uses the auth session to identify the current user.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Check who is logged in (from auth cookies)
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    // Not logged in: return null (not an error)
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Extract GitHub username from OAuth metadata
  const githubUsername = authUser.user_metadata?.user_name || authUser.user_metadata?.preferred_username;

  if (!githubUsername) {
    // No GitHub username in auth: return null
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Look up the user's profile in our DB by GitHub username
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("github_username", githubUsername)
    .single();

  if (error) {
    // No profile found (user hasn't completed onboarding yet)
    if (error.code === "PGRST116") {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert DB snake_case to camelCase for frontend
  const user = {
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
    onboardingStep: data.onboarding_step,
  };

  return NextResponse.json({ user });
}
