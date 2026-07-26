/**
 * Supabase Server Client
 *
 * Usage:
 *   import { createClient } from "@/lib/supabase/server";
 *   const supabase = await createClient();
 *   const { data } = await supabase.from("users").select();
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in server-side code (API routes, Server Components).
 * 
 * This client can read the user's auth cookies to know who is logged in,
 * and can update those cookies if the session needs to be refreshed.
 */
export async function createClient() {
  // Get access to cookies from the current HTTP request
  const cookieStore = await cookies();

  // Build Supabase client and tell it how to read/write cookies
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabase calls this to read auth cookies from the request
        getAll() {
          return cookieStore.getAll();
        },
        // Supabase calls this to update auth cookies -> refresh expired tokens
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can fail in Server Components - that's okay if you have middleware refreshing sessions
          }
        },
      },
    }
  );
}
