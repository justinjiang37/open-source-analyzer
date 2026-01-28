export interface User {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  githubUsername: string;
  primaryLanguages: string[]; // 1-3 languages, most to least familiar
  experienceLevel: "Beginner" | "Intermediate" | "Advanced";
  contributionGoals: string[]; // Can select multiple
  timeBudget: "Short-term (hours → days)" | "Medium (1–2 weeks)" | "Long-term (weeks+)";
  rejectionTolerance: "Low" | "Medium" | "High";
  preferredContributionTypes: string[]; // Can select multiple
  onboardingStep?: number | null; // null = completed, 0 = skipped, 1-4 = in progress
}

// Subset of User for personalized AI summaries
export interface UserPreferences {
  primaryLanguages?: string[];
  experienceLevel?: string;
  contributionGoals?: string[];
  preferredContributionTypes?: string[];
  timeBudget?: string;
  rejectionTolerance?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  stars: number;
  language: string;
  owner: string;
  ownerAvatarUrl: string;
  lastCommitDate: string;
  url?: string;
  forks?: number;
  openIssues?: number;
}

export interface AlivenessMetrics {
  daysSinceLastCommit: number;
  commitVelocity: {
    week: number;
    month: number;
    quarter: number;
  };
  busFactor: {
    top1Percent: number;
    top3Percent: number;
  };
  releaseCadence: number | null; // avg days between releases, null if no releases
  issueChurn: {
    opened30: number;
    closed30: number;
    opened90: number;
    closed90: number;
  };
}

export interface ContributionOutcomesMetrics {
  prAcceptanceRate: number; // percentage of PRs merged vs closed
  timeToFirstResponse: number | null; // avg hours until first maintainer response
  timeToMerge: number | null; // avg hours from open to merge
  externalContributorShare: number; // percentage of PRs from non-maintainers
  closedWithoutMergeRate: number; // percentage of PRs closed without merge
  totalPRs: {
    merged: number;
    closed: number;
    open: number;
  };
}

export const mockUser: User = {
  id: "1",
  name: "Jane Developer",
  bio: "Full-stack developer passionate about open source",
  avatarUrl: "https://github.com/github.png",
  githubUsername: "janedev",
  primaryLanguages: ["JavaScript", "TypeScript", "Python"],
  experienceLevel: "Intermediate",
  contributionGoals: ["Learning", "Shipping features"],
  timeBudget: "Medium (1–2 weeks)",
  rejectionTolerance: "Medium",
  preferredContributionTypes: ["Bug fixes", "Features", "Documentation"],
};

export const mockProjects: Project[] = [
  {
    id: "1",
    name: "react",
    description: "The library for web and native user interfaces",
    stars: 225000,
    language: "JavaScript",
    owner: "facebook",
    ownerAvatarUrl: "https://avatars.githubusercontent.com/u/69631?v=4",
    lastCommitDate: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "next.js",
    description: "The React Framework for the Web",
    stars: 120000,
    language: "TypeScript",
    owner: "vercel",
    ownerAvatarUrl: "https://avatars.githubusercontent.com/u/14985020?v=4",
    lastCommitDate: "2024-01-14T08:45:00Z",
  },
  {
    id: "3",
    name: "tailwindcss",
    description: "A utility-first CSS framework for rapid UI development",
    stars: 78000,
    language: "CSS",
    owner: "tailwindlabs",
    ownerAvatarUrl: "https://avatars.githubusercontent.com/u/67109815?v=4",
    lastCommitDate: "2024-01-13T14:20:00Z",
  },
  {
    id: "4",
    name: "vscode",
    description: "Visual Studio Code - Open Source IDE",
    stars: 160000,
    language: "TypeScript",
    owner: "microsoft",
    ownerAvatarUrl: "https://avatars.githubusercontent.com/u/6154722?v=4",
    lastCommitDate: "2024-01-15T12:00:00Z",
  },
  {
    id: "5",
    name: "rust",
    description: "Empowering everyone to build reliable and efficient software",
    stars: 92000,
    language: "Rust",
    owner: "rust-lang",
    ownerAvatarUrl: "https://avatars.githubusercontent.com/u/5430905?v=4",
    lastCommitDate: "2024-01-12T16:30:00Z",
  },
  {
    id: "6",
    name: "deno",
    description: "A modern runtime for JavaScript and TypeScript",
    stars: 93000,
    language: "Rust",
    owner: "denoland",
    ownerAvatarUrl: "https://avatars.githubusercontent.com/u/42048915?v=4",
    lastCommitDate: "2024-01-11T09:15:00Z",
  },
];
