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
  // Server-side Supabase client (uses auth cookies to identify the user)
  const supabase = await createClient();
  // Read the dynamic route param from the URL
  const { projectId } = await params;

  // Auth guard: only logged-in users can delete favorites
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete from DB (RLS should ensure the user can only delete their own rows)
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Success: nothing else to return
  return NextResponse.json({ success: true });
}
