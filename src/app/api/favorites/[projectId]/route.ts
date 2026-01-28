/**
 * Favorites API Route - Delete
 *
 * DELETE /api/favorites/[projectId] - Remove a project from favorites
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/favorites/[projectId] - Remove a project from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const supabase = await createClient();
  const { projectId } = await params;

  // Check authentication
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete the favorite (RLS ensures user can only delete their own)
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
