/**
 * Auth Button Component
 *
 * Displays either:
 * - "Sign in with GitHub" button (when logged out)
 * - User avatar + dropdown with sign out (when logged in)
 *
 * Uses Supabase client-side auth to check session state
 * and handle sign in/out flows.
 */

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Github, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  // Local auth state for the navbar (logged-in user vs logged-out).
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    // On mount: read the current session from Supabase.
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Keep state in sync when the user logs in/out.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; // Redirect to home after sign out
  };

  if (loading) {
    // Show placeholder while checking auth state
    return (
      <div className="w-20 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    );
  }

  if (user) {
    // Logged in - show avatar and sign out
    const avatarUrl = user.user_metadata?.avatar_url;
    const name = user.user_metadata?.full_name || user.email || "User";

    return (
      <div className="flex items-center gap-3">
        <Avatar className="size-8 ring-2 ring-blue-200 dark:ring-blue-800">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="bg-blue-500 text-white text-sm">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    );
  }

  // Logged out - show sign in button
  return (
    <Button onClick={handleSignIn} variant="outline" size="sm">
      <Github className="size-4 mr-2" />
      Sign in
    </Button>
  );
}
