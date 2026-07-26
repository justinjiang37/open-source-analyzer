"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { AuthButton } from "@/components/auth-button";

// Top navigation bar shown on every page (links + theme toggle + auth button).
export function Navbar() {
  const pathname = usePathname();
  const { toggleTheme } = useTheme();

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 shadow-sm">
      <div className="flex h-16 items-center justify-between px-12">
        {/* Brand */}
        <Link
          href="/"
          className="text-xl font-bold text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          OSS Analyzer
        </Link>

        {/* Navigation Links + Theme Toggle */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-6 mr-4">
            {/* Nav links highlight based on current pathname */}
            <Link
              href="/explore"
              className={cn(
                "text-base font-medium px-3 py-2 rounded-md transition-all duration-200",
                pathname === "/explore"
                  ? "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50"
                  : "text-gray-700 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800"
              )}
            >
              Explore
            </Link>
            <Link
              href="/favorites"
              className={cn(
                "text-base font-medium px-3 py-2 rounded-md transition-all duration-200",
                pathname === "/favorites"
                  ? "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50"
                  : "text-gray-700 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800"
              )}
            >
              Favorites
            </Link>
            <Link
              href="/profile"
              className={cn(
                "text-base font-medium px-3 py-2 rounded-md transition-all duration-200",
                pathname === "/profile"
                  ? "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50"
                  : "text-gray-700 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800"
              )}
            >
              Profile
            </Link>
          </nav>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            aria-label="Toggle theme"
          >
            {/* Both icons rendered; CSS picks one so server and client markup match */}
            <Moon className="size-5 dark:hidden" />
            <Sun className="size-5 hidden dark:block" />
          </button>

          {/* Auth Button */}
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
