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

/**
 * Handles the OAuth callback after user signs in with GitHub.
 * 
 * This is where GitHub redirects the user after they authorize the app.
 * We exchange the temporary code for a permanent session, then decide where to send them.
 */
export async function GET(request: NextRequest) {
  // Extract the authorization code from the URL (GitHub sends this)
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  
  // Check if there's a "next" parameter telling us where to redirect after login
  // ?? operator -> nullish coalescing -> if left is null the use right else just use left
  const next = requestUrl.searchParams.get("next") ?? "/profile";

  // Only proceed if we got a valid code from GitHub
  if (code) {
    const supabase = await createClient();

    // Exchange the temporary code for a permanent session
    // This creates auth cookies that prove the user is logged in
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get info about who just logged in
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        // Extract GitHub username from the auth data
        const githubUsername =
          authUser.user_metadata?.user_name ||
          authUser.user_metadata?.preferred_username;

        // Check if this user already has a profile in our database
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, onboarding_step")
          .eq("auth_id", authUser.id)
          .single();

        if (!existingUser) {
          // Brand new user - create their profile with default values
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

          // Send new users to onboarding to fill out their profile
          return NextResponse.redirect(
            new URL("/onboarding/1", requestUrl.origin)
          );
        }

        // Existing user - check if they're in the middle of onboarding
        const step = existingUser.onboarding_step;
        if (typeof step === "number" && step >= 1 && step <= 4) {
          // Resume onboarding from where they left off
          return NextResponse.redirect(
            new URL(`/onboarding/${step}`, requestUrl.origin)
          );
        }
      }

      // User is logged in and has completed onboarding - send them to their destination
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Something went wrong (no code, or error exchanging it) - send to homepage
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
