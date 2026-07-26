"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Resolve the initial theme on the client (saved preference, then system preference).
// On the server there is no window; the inline script in layout.tsx applies the
// real theme class before hydration, so the placeholder never flashes.
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// App-wide theme provider (light/dark) backed by localStorage + system preference.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    // Apply theme by toggling the `dark` class on <html>.
    document.documentElement.classList.toggle("dark", theme === "dark");
    // Persist the choice for future visits.
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Switch between light and dark.
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook for reading/changing theme inside client components.
export function useTheme() {
  const context = useContext(ThemeContext);
  // Return default values if not inside provider (for static pages)
  if (context === undefined) {
    return {
      theme: "light" as Theme,
      toggleTheme: () => {},
    };
  }
  return context;
}
