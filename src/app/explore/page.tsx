"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Project, AlivenessMetrics, ContributionOutcomesMetrics, UserPreferences } from "@/lib/mock-data";

const LANGUAGES = [
  "All",
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C++",
  "C",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
];

export interface PrefetchedInsights {
  aliveness: AlivenessMetrics;
  contributionOutcomes: ContributionOutcomesMetrics;
}

// Prefetch insights only (summary is user-triggered)
async function prefetchInsights(
  project: Project,
  onComplete: (key: string, data: PrefetchedInsights) => void
) {
  try {
    const insightsRes = await fetch(`/api/projects/${project.owner}/${project.name}/insights`, {
      priority: "low",
    } as RequestInit);
    if (!insightsRes.ok) return;
    const insights = await insightsRes.json();

    onComplete(`${project.owner}/${project.name}`, {
      aliveness: insights.aliveness,
      contributionOutcomes: insights.contributionOutcomes,
    });
  } catch {
    // Silently ignore prefetch errors
  }
}

export default function ExplorePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [prefetchedData, setPrefetchedData] = useState<Record<string, PrefetchedInsights>>({});
  const prefetchedRef = useRef<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

  // Fetch user's favorites and preferences on mount
  useEffect(() => {
    async function fetchUserData() {
      try {
        // Fetch favorites
        const favRes = await fetch("/api/favorites");
        if (favRes.ok) {
          const data = await favRes.json();
          const ids = new Set<string>(data.favorites.map((f: { projectId: string }) => f.projectId));
          setFavoriteIds(ids);
        }

        // Fetch user profile for preferences
        const profileRes = await fetch("/api/users/me");
        if (profileRes.ok) {
          const userData = await profileRes.json();
          if (userData.user) {
            setUserPreferences({
              primaryLanguages: userData.user.primaryLanguages,
              experienceLevel: userData.user.experienceLevel,
              contributionGoals: userData.user.contributionGoals,
              preferredContributionTypes: userData.user.preferredContributionTypes,
              timeBudget: userData.user.timeBudget,
              rejectionTolerance: userData.user.rejectionTolerance,
            });
          }
        }
      } catch {
        // User not logged in or error - ignore
      }
    }
    fetchUserData();
  }, []);

  const handleFavoriteToggle = (projectId: string, isFavorited: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorited) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });
  };

  const fetchProjects = useCallback(async (search: string, language: string, pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (language && language !== "All") params.set("language", language);
      params.set("page", pageNum.toString());
      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (append) {
        setProjects((prev) => [...prev, ...data.projects]);
      } else {
        setProjects(data.projects);
      }
      setTotalCount(data.total);
    } catch (err) {
      setError("Failed to load projects");
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Debounced search (also handles initial fetch)
  // Reset to page 1 when search or language changes
  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => {
      fetchProjects(searchQuery, selectedLanguage, 1, false);
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedLanguage, fetchProjects]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProjects(searchQuery, selectedLanguage, nextPage, true);
  };

  const hasMore = projects.length < totalCount;

  // Callback to store prefetched data
  const handlePrefetchComplete = useCallback((key: string, data: PrefetchedInsights) => {
    setPrefetchedData((prev) => ({ ...prev, [key]: data }));
  }, []);

  // Prefetch insights + summary for visible projects after they load
  useEffect(() => {
    if (loading || projects.length === 0) return;

    // Stagger prefetch requests to avoid overwhelming the API
    const prefetchQueue = projects.filter((p) => {
      const key = `${p.owner}/${p.name}`;
      if (prefetchedRef.current.has(key)) return false;
      prefetchedRef.current.add(key);
      return true;
    });

    prefetchQueue.forEach((project, index) => {
      // Stagger requests by 200ms each
      setTimeout(() => {
        prefetchInsights(project, handlePrefetchComplete);
      }, index * 200);
    });
  }, [projects, loading, handlePrefetchComplete]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="sticky top-8 space-y-8">
              {/* Welcome Message */}
              <div>
                <h2 className="text-lg font-semibold text-blue-950 dark:text-blue-100 mb-3">
                  Hi there!
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  I see you want to contribute to an open source project. Well the OSS Analyzer is here to serve that purpose. Start typing in keywords in the search bar or use the filter dropdown to quickly narrow down the best repos for your needs.
                </p>
              </div>

              {/* OSS Dictionary */}
              <div>
                <h3 className="text-base font-semibold text-blue-950 dark:text-blue-100 mb-4">
                  OSS Dictionary
                </h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">Commit Recency</dt>
                    <dd className="text-gray-500 dark:text-gray-400">How many days has it been since the last commit?</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">Commit Velocity</dt>
                    <dd className="text-gray-500 dark:text-gray-400">How often code is being committed over time?</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">Bus Factor</dt>
                    <dd className="text-gray-500 dark:text-gray-400">How concentrated the contributions are among the top contributors?</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">Release Cadence</dt>
                    <dd className="text-gray-500 dark:text-gray-400">How frequently new releases are published?</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">Issue Churn</dt>
                    <dd className="text-gray-500 dark:text-gray-400">How many issues are opened versus closed in a given period?</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">PR Acceptance</dt>
                    <dd className="text-gray-500 dark:text-gray-400">How often submitted pull requests get merged?</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">First Response</dt>
                    <dd className="text-gray-500 dark:text-gray-400">How long it typically takes maintainers to respond to a new PR?</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">Time to Merge</dt>
                    <dd className="text-gray-500 dark:text-gray-400">How long it usually takes for a PR to get merged after submission?</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">External PRs</dt>
                    <dd className="text-gray-500 dark:text-gray-400">What percentage of PRs come from outside contributors?</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">Rejected</dt>
                    <dd className="text-gray-500 dark:text-gray-400">How many PRs get closed without being merged?</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900 dark:text-gray-100">Pull Request Summary</dt>
                    <dd className="text-gray-500 dark:text-gray-400">The counts of merged, closed, and open PRs.</dd>
                  </div>
                </dl>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-blue-950 dark:text-blue-100 mb-2">
                Explore Projects
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Discover open source projects to contribute to
              </p>
            </div>

            {/* Search Bar and Filters */}
            <div className="mb-8 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search projects by name or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-600/10 dark:focus:ring-blue-400/10"
                />
              </div>

              {/* Language Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-12 px-4 min-w-[160px] flex items-center justify-between gap-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 transition-all duration-200 outline-none hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-600/10 dark:focus:ring-blue-400/10">
                    <span className={selectedLanguage === "All" ? "text-gray-400 dark:text-gray-500" : ""}>
                      {selectedLanguage === "All" ? "Language" : selectedLanguage}
                    </span>
                    <ChevronDown className="size-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[160px]">
                  <DropdownMenuLabel>Language</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={selectedLanguage === lang ? "bg-blue-50 dark:bg-blue-900/30" : ""}
                    >
                      {lang}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-error-light dark:bg-red-900/30 border-l-4 border-error text-error-dark dark:text-red-300">
                {error}
              </div>
            )}

            {/* Projects List */}
            <div className="flex flex-col gap-3">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))
                : projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      prefetchedData={prefetchedData[`${project.owner}/${project.name}`]}
                      isFavorited={favoriteIds.has(project.id)}
                      onFavoriteToggle={handleFavoriteToggle}
                      userPreferences={userPreferences}
                    />
                  ))}
            </div>

            {/* Load More Button */}
            {!loading && !error && hasMore && projects.length > 0 && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="px-8 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-400 transition-colors"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && projects.length === 0 && (
              <div className="text-center py-16">
                <div className="text-gray-400 dark:text-gray-600 mb-4">
                  <Search className="size-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No projects found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
