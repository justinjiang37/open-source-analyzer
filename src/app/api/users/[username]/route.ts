/**
 * User API Route - GET and PUT by GitHub username
 *
 * GET /api/users/[username] - Fetch a user's profile
 * PUT /api/users/[username] - Update a user's profile
 *
 * Note: Uses regular server client which respects Row Level Security (RLS) policies.
 * Ensure your Supabase RLS policies allow the necessary operations.
 * Once auth is added, these will be protected by session checks.
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/users/[username] - Fetch user profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  // Read GitHub username from URL (e.g., /api/users/janedev)
  const { username } = await params;
  const supabase = await createClient();

  // Look up user by GitHub username
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("github_username", username)
    .single();

  if (error) {
    // No user found (not an error, just return null)
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

// PUT /api/users/[username] - Update user profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  // Read GitHub username from URL (prevents unauthorized username changes)
  const { username } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Convert frontend camelCase to DB snake_case
  // Use username from URL, not body (security: can't change your own username)
  const dbData: Record<string, unknown> = {
    name: body.name,
    bio: body.bio,
    avatar_url: body.avatarUrl,
    github_username: username, // Use URL param, ignore body.githubUsername
    primary_languages: body.primaryLanguages,
    experience_level: body.experienceLevel,
    contribution_goals: body.contributionGoals,
    time_budget: body.timeBudget,
    rejection_tolerance: body.rejectionTolerance,
    preferred_contribution_types: body.preferredContributionTypes,
    updated_at: new Date().toISOString(),
  };

  // Optionally update onboarding_step if provided
  if ("onboardingStep" in body) {
    dbData.onboarding_step = body.onboardingStep;
  }

  // Update the user's profile in DB
  const { data, error } = await supabase
    .from("users")
    .update(dbData)
    .eq("github_username", username)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert DB snake_case back to camelCase for frontend
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

  return NextResponse.json({ success: true, user });
}
