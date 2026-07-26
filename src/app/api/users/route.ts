/**
 * Users API Route - POST to create new user
 *
 * POST /api/users - Create a new user profile (or upsert)
 *
 * This uses "upsert" which means:
 * - If user with this github_username doesn't exist: CREATE
 * - If user with this github_username exists: UPDATE
 *
 * This is useful for "sign up" flows or first-time profile creation.
 *
 * Note: Uses regular server client which respects Row Level Security (RLS) policies.
 * Ensure your Supabase RLS policies allow the necessary operations.
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/users - Create or update user profile
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  // Require GitHub username (used as unique identifier)
  if (!body.githubUsername) {
    return NextResponse.json(
      { error: "githubUsername is required" },
      { status: 400 }
    );
  }

  // Convert frontend camelCase to DB snake_case format
  const dbData = {
    name: body.name || body.githubUsername,
    bio: body.bio || "",
    avatar_url: body.avatarUrl || `https://github.com/${body.githubUsername}.png`,
    github_username: body.githubUsername,
    primary_languages: body.primaryLanguages || [],
    experience_level: body.experienceLevel || "Beginner",
    contribution_goals: body.contributionGoals || [],
    time_budget: body.timeBudget || "Medium (1–2 weeks)",
    rejection_tolerance: body.rejectionTolerance || "Medium",
    preferred_contribution_types: body.preferredContributionTypes || [],
  };

  // Upsert: create if new, update if exists (conflict on github_username)
  const { data, error } = await supabase
    .from("users")
    .upsert(dbData, { onConflict: "github_username" })
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
  };

  return NextResponse.json({ success: true, user }, { status: 201 });
}
