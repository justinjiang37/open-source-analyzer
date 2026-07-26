/**
 * Favorites API Route
 *
 * GET /api/favorites - Get user's favorite projects
 * POST /api/favorites - Add a project to favorites
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/favorites - Get all favorites for the authenticated user
export async function GET() {
  // Server-side Supabase client (uses auth cookies to identify the user)
  const supabase = await createClient();

  // Auth guard: only logged-in users can read favorites
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch favorites from DB (RLS should limit rows to this user)
  const { data: favorites, error } = await supabase
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert DB snake_case fields to camelCase for the frontend
  const transformedFavorites = (favorites || []).map((fav) => ({
    id: fav.id,
    projectId: fav.project_id,
    projectName: fav.project_name,
    projectOwner: fav.project_owner,
    projectDescription: fav.project_description,
    projectLanguage: fav.project_language,
    projectStars: fav.project_stars,
    projectOwnerAvatarUrl: fav.project_owner_avatar_url,
    createdAt: fav.created_at,
  }));

  return NextResponse.json({ favorites: transformedFavorites });
}

// POST /api/favorites - Add a project to favorites
export async function POST(request: NextRequest) {
  // Server-side Supabase client (uses auth cookies to identify the user)
  const supabase = await createClient();

  // Auth guard: only logged-in users can add favorites
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read request body (project info from the UI)
  const body = await request.json();

  // Basic validation (minimum info needed to save a favorite)
  if (!body.projectId || !body.projectName || !body.projectOwner) {
    return NextResponse.json(
      { error: "projectId, projectName, and projectOwner are required" },
      { status: 400 }
    );
  }

  // Insert into DB and associate it to this user via auth_id
  const { data, error } = await supabase
    .from("favorites")
    .insert({
      auth_id: authUser.id,
      project_id: body.projectId,
      project_name: body.projectName,
      project_owner: body.projectOwner,
      project_description: body.projectDescription || null,
      project_language: body.projectLanguage || null,
      project_stars: body.projectStars || null,
      project_owner_avatar_url: body.projectOwnerAvatarUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Favorites insert error:", error);
    // Duplicate favorite (unique constraint violation)
    if (error.code === "23505") {
      return NextResponse.json({ error: "Project already in favorites" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Success: return the inserted row
  return NextResponse.json({ success: true, favorite: data }, { status: 201 });
}
