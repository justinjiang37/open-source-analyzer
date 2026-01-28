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
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all favorites for this user (RLS filters by auth_id automatically)
  const { data: favorites, error } = await supabase
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to camelCase for frontend
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
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Validate required fields
  if (!body.projectId || !body.projectName || !body.projectOwner) {
    return NextResponse.json(
      { error: "projectId, projectName, and projectOwner are required" },
      { status: 400 }
    );
  }

  // Insert the favorite with auth_id for RLS
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
    // Handle duplicate entry
    if (error.code === "23505") {
      return NextResponse.json({ error: "Project already in favorites" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, favorite: data }, { status: 201 });
}
