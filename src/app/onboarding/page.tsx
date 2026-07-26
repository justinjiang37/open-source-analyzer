import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * `/onboarding` entry page.
 *
 * This page doesn't render UI — it just decides which onboarding step route
 * the user should be sent to, based on their saved `onboarding_step`.
 */
export default async function OnboardingPage() {
  // Server-side Supabase client (reads auth cookies from the request)
  const supabase = await createClient();

  // Auth guard: if there's no logged-in user, send them away
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  // Pull GitHub username from the auth session metadata (set by GitHub OAuth)
  const githubUsername =
    authUser.user_metadata?.user_name ||
    authUser.user_metadata?.preferred_username;

  // Safety check: if we can't identify the user, treat as not authenticated
  if (!githubUsername) {
    redirect("/");
  }

  // Read the user's current onboarding step from our `users` table
  const { data: existingUser } = await supabase
    .from("users")
    .select("onboarding_step")
    .eq("auth_id", authUser.id)
    .single();

  // Decide which step route to send them to
  // ?. -> optional chaining, if existingUser is defined, then get onboarding_step, else return null
  const step = existingUser?.onboarding_step;

  if (typeof step === "number" && step >= 1 && step <= 5) {
    // Resume onboarding where they left off
    redirect(`/onboarding/${step}`);
  }

  // Default: start onboarding at step 1
  redirect("/onboarding/1");
}
