/**
 * Onboarding Flow Utilities
 *
 * Constants, types, and helper functions for the multi-step onboarding flow.
 */

export const ONBOARDING_STEPS = [
  { number: 1, label: "Welcome", path: "/onboarding/1" },
  { number: 2, label: "Skills", path: "/onboarding/2" },
  { number: 3, label: "Goals", path: "/onboarding/3" },
  { number: 4, label: "Preferences", path: "/onboarding/4" },
  { number: 5, label: "Complete", path: "/onboarding/5" },
] as const;

export const TOTAL_STEPS = 5;

// Fields collected at each step
export const STEP_FIELDS = {
  1: ["name", "bio"],
  2: ["primaryLanguages", "experienceLevel"],
  3: ["contributionGoals", "preferredContributionTypes"],
  4: ["timeBudget", "rejectionTolerance"],
  5: [], // Summary only
} as const;

// Options for form fields
export const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const CONTRIBUTION_GOALS = [
  "Resume",
  "Learning",
  "Shipping features",
  "Networking",
  "Just for fun!",
] as const;
export const TIME_BUDGETS = [
  "Short-term (hours → days)",
  "Medium (1–2 weeks)",
  "Long-term (weeks+)",
] as const;
export const REJECTION_TOLERANCES = ["Low", "Medium", "High"] as const;
export const CONTRIBUTION_TYPES = [
  "Documentation",
  "Bug fixes",
  "Features",
  "Refactors",
  "Issues / triage",
] as const;

// Type for onboarding data
export type OnboardingData = {
  name: string;
  bio: string;
  primaryLanguages: string[];
  experienceLevel: string;
  contributionGoals: string[];
  timeBudget: string;
  rejectionTolerance: string;
  preferredContributionTypes: string[];
};

/**
 * Determines if onboarding is required for a user
 * @param onboardingStep - The user's current onboarding step
 * @returns true if user should be redirected to onboarding
 */
export function isOnboardingRequired(onboardingStep: number | null | undefined): boolean {
  // null/undefined = completed or legacy user (no onboarding required)
  // 0 = explicitly skipped (no onboarding required)
  // 1-4 = in progress (onboarding required)
  return typeof onboardingStep === "number" && onboardingStep >= 1 && onboardingStep <= 4;
}

/**
 * Gets the appropriate redirect path for a user based on onboarding state
 * @param onboardingStep - The user's current onboarding step
 * @returns The path to redirect to
 */
export function getOnboardingRedirect(onboardingStep: number | null | undefined): string | null {
  if (isOnboardingRequired(onboardingStep)) {
    return `/onboarding/${onboardingStep}`;
  }
  return null;
}
