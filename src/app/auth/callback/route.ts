/**
 * Auth Callback Route
 *
 * This route handles the OAuth callback from Supabase.
 *
 * Flow:
 * 1. User signs in with GitHub
 * 2. GitHub redirects to Supabase
 * 3. Supabase redirects here with a `code` parameter
 * 4. We exchange the code for a session (sets cookies)
 * 5. Check if user is new or has incomplete onboarding
 * 6. Redirect to onboarding or intended destination
 *
 * The `code` is a one-time use authorization code that Supabase
 * uses to establish the user's session securely.
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Where to redirect after auth (default to profile)
  const next = requestUrl.searchParams.get("next") ?? "/profile";

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    // This sets the auth cookies automatically
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the authenticated user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const githubUsername =
          authUser.user_metadata?.user_name ||
          authUser.user_metadata?.preferred_username;

        // Check if profile exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, onboarding_step")
          .eq("auth_id", authUser.id)
          .single();

        if (!existingUser) {
          // New user - create profile and redirect to onboarding
          const newProfile = {
            auth_id: authUser.id,
            name:
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              githubUsername,
            bio: "",
            avatar_url: authUser.user_metadata?.avatar_url,
            github_username: githubUsername,
            primary_languages: [],
            experience_level: "Beginner",
            contribution_goals: [],
            time_budget: "Medium (1–2 weeks)",
            rejection_tolerance: "Medium",
            preferred_contribution_types: [],
            onboarding_step: 1, // Start at step 1
          };

          await supabase.from("users").insert(newProfile);

          return NextResponse.redirect(
            new URL("/onboarding/1", requestUrl.origin)
          );
        }

        // Existing user - check if onboarding is incomplete
        const step = existingUser.onboarding_step;
        if (typeof step === "number" && step >= 1 && step <= 4) {
          // Resume onboarding from saved step
          return NextResponse.redirect(
            new URL(`/onboarding/${step}`, requestUrl.origin)
          );
        }
      }

      // Completed user or no special handling needed
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If there's an error or no code, redirect to homepage
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
