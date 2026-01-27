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
 * 5. Redirect user to their destination (profile page)
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
      // Success - redirect to the intended destination
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If there's an error or no code, redirect to homepage
  // You could also redirect to an error page
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
