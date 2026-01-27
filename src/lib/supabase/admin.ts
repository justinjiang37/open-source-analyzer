/**
 * Supabase Admin Client (Service Role)
 *
 * IMPORTANT: Only use this in server-side code (API routes, server actions).
 * NEVER import this in client components or expose to the browser.
 *
 * This client uses the service_role key which:
 * - Bypasses ALL Row Level Security (RLS) policies
 * - Has full read/write access to all tables
 * - Should only be used for admin operations or when RLS doesn't apply
 *
 * Use cases:
 * - API routes that need to write data before auth is set up
 * - Background jobs / cron tasks
 * - Admin dashboards
 *
 * When auth is implemented, prefer the regular server client with RLS.
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
