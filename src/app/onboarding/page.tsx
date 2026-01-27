import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  // Get GitHub username from auth metadata
  const githubUsername =
    authUser.user_metadata?.user_name ||
    authUser.user_metadata?.preferred_username;

  if (!githubUsername) {
    redirect("/");
  }

  // Check user's current onboarding step
  const { data: existingUser } = await supabase
    .from("users")
    .select("onboarding_step")
    .eq("auth_id", authUser.id)
    .single();

  // Determine which step to redirect to
  const step = existingUser?.onboarding_step;

  if (typeof step === "number" && step >= 1 && step <= 5) {
    // Resume from saved step
    redirect(`/onboarding/${step}`);
  }

  // Default to step 1 for new users or start fresh
  redirect("/onboarding/1");
}
