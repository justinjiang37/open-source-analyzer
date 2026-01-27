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
  const { username } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("github_username", username)
    .single();

  if (error) {
    // PGRST116 = no rows found (not an error, just no user yet)
    if (error.code === "PGRST116") {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform snake_case from DB to camelCase for frontend
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
  };

  return NextResponse.json({ user });
}

// PUT /api/users/[username] - Update user profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Transform camelCase from frontend to snake_case for DB
  // Use username from URL params, not body (prevents unauthorized username changes)
  const dbData = {
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

  const { data, error } = await supabase
    .from("users")
    .update(dbData)
    .eq("github_username", username)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform snake_case from DB to camelCase for frontend (consistent with GET)
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
  };

  return NextResponse.json({ success: true, user });
}
