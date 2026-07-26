"use client";

import { useState } from "react";
import { Star, GitCommit, ChevronDown, Clock, Activity, Users, Tag, GitPullRequest, CheckCircle2, MessageSquare, Timer, UserPlus, XCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "@/components/favorite-button";
import { Project, AlivenessMetrics, ContributionOutcomesMetrics, UserPreferences } from "@/lib/mock-data";
import Image from "next/image";

/**
 * ProjectCard
 *
 * A single “repo row” on the Explore/Favorites pages.
 * - Collapsed: basic repo info (name, stars, owner, last commit)
 * - Expanded: cached metrics (insights) + optional AI summary
 * - Includes a star button to favorite/unfavorite the repo
 */

interface PrefetchedInsights {
  aliveness: AlivenessMetrics;
  contributionOutcomes: ContributionOutcomesMetrics;
}

interface ProjectCardProps {
  project: Project;
  prefetchedData?: PrefetchedInsights;
  isFavorited?: boolean;
  onFavoriteToggle?: (projectId: string, isFavorited: boolean) => void;
  userPreferences?: UserPreferences | null;
}

// Small formatting helpers for display.
function formatStars(stars: number): string {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return stars.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "today";
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? "s" : ""} ago`;
  }
}

function getRecencyColor(days: number): string {
  if (days <= 7) return "text-green-600 dark:text-green-400";
  if (days <= 30) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getBusFactorColor(percent: number): string {
  if (percent >= 80) return "text-red-600 dark:text-red-400"; // High risk - one person does most work
  if (percent >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400"; // Healthy distribution
}

function getAcceptanceRateColor(percent: number): string {
  if (percent >= 70) return "text-green-600 dark:text-green-400";
  if (percent >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getResponseTimeColor(hours: number): string {
  if (hours <= 24) return "text-green-600 dark:text-green-400"; // Within a day
  if (hours <= 72) return "text-yellow-600 dark:text-yellow-400"; // Within 3 days
  return "text-red-600 dark:text-red-400"; // Slow response
}

function getMergeTimeColor(hours: number): string {
  if (hours <= 48) return "text-green-600 dark:text-green-400"; // Within 2 days
  if (hours <= 168) return "text-yellow-600 dark:text-yellow-400"; // Within a week
  return "text-red-600 dark:text-red-400"; // Slow merge
}

function getExternalShareColor(percent: number): string {
  if (percent >= 30) return "text-green-600 dark:text-green-400"; // Healthy external contributions
  if (percent >= 10) return "text-yellow-600 dark:text-yellow-400";
  return "text-gray-600 dark:text-gray-400"; // Mostly internal
}

function getClosedWithoutMergeColor(percent: number): string {
  if (percent <= 20) return "text-green-600 dark:text-green-400"; // Low rejection
  if (percent <= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400"; // High rejection
}

function formatHoursToReadable(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function ProjectCard({ project, prefetchedData, isFavorited = false, onFavoriteToggle, userPreferences }: ProjectCardProps) {
  // UI state for expansion + fetched metrics/summary.
  const [expanded, setExpanded] = useState(false);
  const [aliveness, setAliveness] = useState<AlivenessMetrics | null>(null);
  const [contributionOutcomes, setContributionOutcomes] = useState<ContributionOutcomesMetrics | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use prefetched insights when available (Explore page preloads these).
  const displayAliveness = aliveness || prefetchedData?.aliveness || null;
  const displayContributionOutcomes = contributionOutcomes || prefetchedData?.contributionOutcomes || null;
  const hasPrefetchedData = !!prefetchedData;

  // Expand/collapse the card. If metrics aren't prefetched, fetch them on first expand.
  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();

    // If we have prefetched data, just expand without fetching
    if (hasPrefetchedData) {
      setExpanded(!expanded);
      return;
    }

    if (!expanded && !aliveness && !loading) {
      setLoading(true);
      setError(null);

      try {
        // Single API call for all insights (cached for 5 min)
        const res = await fetch(`/api/projects/${project.owner}/${project.name}/insights`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setAliveness(data.aliveness);
        setContributionOutcomes(data.contributionOutcomes);
      } catch (err) {
        setError("Failed to load metrics");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    setExpanded(!expanded);
  };

  // Generate an AI summary (requires metrics, can be personalized using userPreferences).
  const handleGenerateSummary = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (summaryLoading || summary) return;

    const currentAliveness = displayAliveness;
    const currentContributionOutcomes = displayContributionOutcomes;

    if (!currentAliveness || !currentContributionOutcomes) return;

    setSummaryLoading(true);
    try {
      const summaryRes = await fetch(`/api/projects/${project.owner}/${project.name}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aliveness: currentAliveness,
          contributionOutcomes: currentContributionOutcomes,
          projectName: project.name,
          projectDescription: project.description,
          projectLanguage: project.language,
          userPreferences: userPreferences || undefined,
        }),
      });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData.summary);
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 ${expanded ? "ring-2 ring-blue-500/20" : ""}`}
    >
      {/* Main Content - Clickable */}
      <div
        onClick={handleToggle}
        className="p-6 cursor-pointer"
      >
        {/* Header Row: Title + Language + Favorite */}
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 leading-tight">
            {project.name}
          </h3>
          <Badge variant="secondary" className="text-xs shrink-0">
            {project.language}
          </Badge>
          <div className="ml-auto">
            <FavoriteButton
              projectId={project.id}
              projectName={project.name}
              projectOwner={project.owner}
              projectDescription={project.description}
              projectLanguage={project.language}
              projectStars={project.stars}
              projectOwnerAvatarUrl={project.ownerAvatarUrl}
              initialFavorited={isFavorited}
              onToggle={(favorited) => onFavoriteToggle?.(project.id, favorited)}
            />
          </div>
        </div>

        {/* Description Block - Max 2 lines */}
        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-2">
          {project.description}
        </p>

        {/* Metadata Row */}
        <div className="flex items-center gap-6 text-sm">
          {/* Stars */}
          <div className="flex items-center gap-1.5 font-medium">
            <Star className="size-4 text-orange-500 fill-orange-500" />
            <span className="text-gray-700 dark:text-gray-300 font-mono">{formatStars(project.stars)}</span>
          </div>

          {/* Owner with avatar */}
          <div className="flex items-center gap-2">
            <Image
              src={project.ownerAvatarUrl}
              alt={`${project.owner}'s avatar`}
              width={24}
              height={24}
              className="rounded-full ring-2 ring-gray-100 dark:ring-gray-700"
            />
            <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
              {project.owner}
            </span>
          </div>

          {/* Last commit */}
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <GitCommit className="size-4" />
            <span className="font-mono text-xs">{formatDate(project.lastCommitDate)}</span>
          </div>

          {/* Expand indicator - pushed to right */}
          <div className="ml-auto">
            <ChevronDown
              className={`size-5 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </div>

      {/* Expanded Aliveness Section */}
      <div
        className={`grid border-t border-gray-200 dark:border-gray-700 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 transition-all duration-300 ease-in-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 border-t-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-6">
          {/* Section Header */}
          <div className="flex items-center gap-2 mb-4">
            <Activity className="size-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Aliveness
            </h3>
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View on GitHub →
              </a>
            )}
          </div>

          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {displayAliveness && !loading && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Commit Recency */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">
                    <Clock className="size-3.5" />
                    Commit Recency
                  </div>
                  <div className={`font-mono text-2xl font-bold ${getRecencyColor(displayAliveness.daysSinceLastCommit)}`}>
                    {displayAliveness.daysSinceLastCommit}d
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    since last commit
                  </div>
                </div>

                {/* Commit Velocity */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">
                    <Activity className="size-3.5" />
                    Commit Velocity
                  </div>
                  <div className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {displayAliveness.commitVelocity.month}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    commits/month
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {displayAliveness.commitVelocity.week}/wk · {displayAliveness.commitVelocity.quarter}/90d
                  </div>
                </div>

                {/* Bus Factor */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">
                    <Users className="size-3.5" />
                    Bus Factor
                  </div>
                  <div className={`font-mono text-2xl font-bold ${getBusFactorColor(displayAliveness.busFactor.top1Percent)}`}>
                    {displayAliveness.busFactor.top1Percent}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    top contributor
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    top 3: {displayAliveness.busFactor.top3Percent}%
                  </div>
                </div>

                {/* Release Cadence */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">
                    <Tag className="size-3.5" />
                    Release Cadence
                  </div>
                  <div className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {displayAliveness.releaseCadence !== null ? `${displayAliveness.releaseCadence}d` : "—"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {displayAliveness.releaseCadence !== null ? "avg between releases" : "no releases"}
                  </div>
                </div>
              </div>

              {/* Issue Churn */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-3">
                  <GitPullRequest className="size-3.5" />
                  Issue Churn
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last 30 days</div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 dark:text-green-400 font-mono text-lg">
                        +{displayAliveness.issueChurn.opened30}
                      </span>
                      <span className="text-gray-400">/</span>
                      <span className="text-red-600 dark:text-red-400 font-mono text-lg">
                        -{displayAliveness.issueChurn.closed30}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        opened / closed
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last 90 days</div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 dark:text-green-400 font-mono text-lg">
                        +{displayAliveness.issueChurn.opened90}
                      </span>
                      <span className="text-gray-400">/</span>
                      <span className="text-red-600 dark:text-red-400 font-mono text-lg">
                        -{displayAliveness.issueChurn.closed90}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        opened / closed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contribution Outcomes Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="size-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Contribution Outcomes
              </h3>
            </div>

            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            )}

            {displayContributionOutcomes && !loading && (
              <div className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* PR Acceptance Rate */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">
                      <CheckCircle2 className="size-3.5" />
                      PR Acceptance
                    </div>
                    <div className={`font-mono text-2xl font-bold ${getAcceptanceRateColor(displayContributionOutcomes.prAcceptanceRate)}`}>
                      {displayContributionOutcomes.prAcceptanceRate}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      PRs merged
                    </div>
                  </div>

                  {/* Time to First Response */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">
                      <MessageSquare className="size-3.5" />
                      First Response
                    </div>
                    <div className={`font-mono text-2xl font-bold ${displayContributionOutcomes.timeToFirstResponse !== null ? getResponseTimeColor(displayContributionOutcomes.timeToFirstResponse) : "text-gray-400"}`}>
                      {displayContributionOutcomes.timeToFirstResponse !== null ? formatHoursToReadable(displayContributionOutcomes.timeToFirstResponse) : "—"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      avg wait time
                    </div>
                  </div>

                  {/* Time to Merge */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">
                      <Timer className="size-3.5" />
                      Time to Merge
                    </div>
                    <div className={`font-mono text-2xl font-bold ${displayContributionOutcomes.timeToMerge !== null ? getMergeTimeColor(displayContributionOutcomes.timeToMerge) : "text-gray-400"}`}>
                      {displayContributionOutcomes.timeToMerge !== null ? formatHoursToReadable(displayContributionOutcomes.timeToMerge) : "—"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      avg to land
                    </div>
                  </div>

                  {/* External Contributor Share */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">
                      <UserPlus className="size-3.5" />
                      External PRs
                    </div>
                    <div className={`font-mono text-2xl font-bold ${getExternalShareColor(displayContributionOutcomes.externalContributorShare)}`}>
                      {displayContributionOutcomes.externalContributorShare}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      from outside
                    </div>
                  </div>

                  {/* Closed Without Merge */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">
                      <XCircle className="size-3.5" />
                      Rejected
                    </div>
                    <div className={`font-mono text-2xl font-bold ${getClosedWithoutMergeColor(displayContributionOutcomes.closedWithoutMergeRate)}`}>
                      {displayContributionOutcomes.closedWithoutMergeRate}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      closed w/o merge
                    </div>
                  </div>
                </div>

                {/* PR Totals */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-3">
                    <GitPullRequest className="size-3.5" />
                    Pull Request Summary
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Merged</div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 dark:text-green-400 font-mono text-lg font-semibold">
                          {displayContributionOutcomes.totalPRs.merged}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          total
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Closed</div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 dark:text-red-400 font-mono text-lg font-semibold">
                          {displayContributionOutcomes.totalPRs.closed}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          total
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Open</div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-mono text-lg font-semibold">
                          {displayContributionOutcomes.totalPRs.open}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          pending
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Summary
              </h3>
              {summary && (
                <>
                  <Badge variant="secondary" className="text-xs">
                    AI Generated
                  </Badge>
                  {userPreferences && (
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 dark:border-orange-600 dark:text-orange-400">
                      Personalized
                    </Badge>
                  )}
                </>
              )}
            </div>

            {summaryLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
              </div>
            )}

            {summary && !summaryLoading && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {summary}
                </p>
              </div>
            )}

            {!summary && !summaryLoading && !loading && (
              <button
                onClick={handleGenerateSummary}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Sparkles className="size-4" />
                Generate AI Summary
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
