import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout wrapper for all onboarding pages.
 * 
 * This runs on the SERVER (no "use client") to check authentication
 * before any onboarding UI is rendered. This prevents unauthorized access.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create Supabase client to read auth cookies from the HTTP request
  // This happens on the server, so we can securely check who is logged in
  const supabase = await createClient();

  // Check if user is authenticated by reading their session cookies
  // If no valid session exists, authUser will be null
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // If not logged in, redirect to home before rendering any onboarding UI
  // This is a security guard - prevents unauthorized users from accessing onboarding
  if (!authUser) {
    redirect("/");
  }

  // User is authenticated - render the onboarding pages with consistent styling
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-12">{children}</div>
    </div>
  );
}
