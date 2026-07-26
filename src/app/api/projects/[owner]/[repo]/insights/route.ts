import { Octokit } from "octokit";
import { NextRequest, NextResponse } from "next/server";
import { AlivenessMetrics, ContributionOutcomesMetrics } from "@/lib/mock-data";
import { getFromCache, setInCache, getCacheKey } from "@/lib/cache";
import { CACHE_TTL, CACHE_PREFIX } from "@/lib/redis";

// GitHub API client (GraphQL) for combined insights
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const octokit = new Octokit({
  auth: GITHUB_TOKEN || undefined,
});

// Dynamic route params: /api/projects/:owner/:repo/insights
interface RouteParams {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

export interface InsightsResponse {
  aliveness: AlivenessMetrics;
  contributionOutcomes: ContributionOutcomesMetrics;
}

// Combined query - fetches everything in one round trip
// Optimized: reduced PR count and only fetch first review/comment
const INSIGHTS_QUERY = `
  query($owner: String!, $repo: String!, $since90d: GitTimestamp!, $since30d: GitTimestamp!, $since7d: GitTimestamp!, $issuesSince30d: DateTime!, $issuesSince90d: DateTime!) {
    repository(owner: $owner, name: $repo) {
      # === ALIVENESS DATA ===
      pushedAt

      releases(first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          publishedAt
          createdAt
        }
      }

      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 100, since: $since90d) {
              totalCount
              nodes {
                author {
                  user { login }
                  name
                }
                committedDate
              }
            }
            last30: history(first: 100, since: $since30d) {
              totalCount
            }
            last7: history(first: 100, since: $since7d) {
              totalCount
            }
          }
        }
      }

      openedIssues30: issues(filterBy: {since: $issuesSince30d}) {
        totalCount
      }
      openedIssues90: issues(filterBy: {since: $issuesSince90d}) {
        totalCount
      }
      closedIssues30: issues(states: CLOSED, filterBy: {since: $issuesSince30d}) {
        totalCount
      }
      closedIssues90: issues(states: CLOSED, filterBy: {since: $issuesSince90d}) {
        totalCount
      }

      # === CONTRIBUTION OUTCOMES DATA ===
      owner {
        login
      }

      # Reduced from 100 to 50, and only first review/comment for speed
      mergedPRs: pullRequests(first: 50, states: MERGED, orderBy: {field: UPDATED_AT, direction: DESC}) {
        totalCount
        nodes {
          createdAt
          mergedAt
          author { login }
          reviews(first: 1) {
            nodes {
              createdAt
              author { login }
            }
          }
          comments(first: 1) {
            nodes {
              createdAt
              author { login }
            }
          }
        }
      }

      closedPRs: pullRequests(first: 50, states: CLOSED, orderBy: {field: UPDATED_AT, direction: DESC}) {
        totalCount
        nodes {
          createdAt
          closedAt
          mergedAt
          author { login }
          reviews(first: 1) {
            nodes {
              createdAt
              author { login }
            }
          }
          comments(first: 1) {
            nodes {
              createdAt
              author { login }
            }
          }
        }
      }

      openPRs: pullRequests(first: 1, states: OPEN) {
        totalCount
      }
    }
  }
`;

interface ReviewOrComment {
  createdAt: string;
  author: { login: string } | null;
}

interface PullRequest {
  createdAt: string;
  mergedAt?: string | null;
  closedAt?: string | null;
  author: { login: string } | null;
  reviews: { nodes: ReviewOrComment[] };
  comments: { nodes: ReviewOrComment[] };
}

interface GraphQLResponse {
  repository: {
    pushedAt: string;
    releases: {
      nodes: Array<{ publishedAt: string | null; createdAt: string }>;
    };
    defaultBranchRef: {
      target: {
        history: {
          totalCount: number;
          nodes: Array<{
            author: { user: { login: string } | null; name: string | null };
            committedDate: string;
          }>;
        };
        last30: { totalCount: number };
        last7: { totalCount: number };
      };
    } | null;
    openedIssues30: { totalCount: number };
    openedIssues90: { totalCount: number };
    closedIssues30: { totalCount: number };
    closedIssues90: { totalCount: number };
    owner: { login: string };
    mergedPRs: { totalCount: number; nodes: PullRequest[] };
    closedPRs: { totalCount: number; nodes: PullRequest[] };
    openPRs: { totalCount: number };
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { owner, repo } = await params;

  // Try cache first (fast path): insights:<owner>/<repo>
  const cacheKey = getCacheKey(CACHE_PREFIX.INSIGHTS, owner, repo);

  const cached = await getFromCache<InsightsResponse>(cacheKey);
  if (cached) {
    // Cache hit
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    // Compute time windows used by the query (7d / 30d / 90d)
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all repo activity + PR data in one GraphQL request
    const response = await octokit.graphql<GraphQLResponse>(INSIGHTS_QUERY, {
      owner,
      repo,
      since90d: ninetyDaysAgo.toISOString(),
      since30d: thirtyDaysAgo.toISOString(),
      since7d: sevenDaysAgo.toISOString(),
      issuesSince30d: thirtyDaysAgo.toISOString(),
      issuesSince90d: ninetyDaysAgo.toISOString(),
    });

    const repoData = response.repository;

    // === CALCULATE ALIVENESS METRICS ===
    const pushedAt = new Date(repoData.pushedAt);
    const daysSinceLastCommit = Math.floor(
      (now.getTime() - pushedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const commitHistory = repoData.defaultBranchRef?.target;
    const weekCommits = commitHistory?.last7?.totalCount ?? 0;
    const monthCommits = commitHistory?.last30?.totalCount ?? 0;
    const quarterCommits = commitHistory?.history?.totalCount ?? 0;

    const commits = commitHistory?.history?.nodes ?? [];
    const authorCounts: Record<string, number> = {};
    commits.forEach((commit) => {
      const author = commit.author?.user?.login || commit.author?.name || "unknown";
      authorCounts[author] = (authorCounts[author] || 0) + 1;
    });

    const sortedAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]);
    const totalCommits = commits.length || 1;
    const top1Percent = sortedAuthors.length > 0
      ? Math.round((sortedAuthors[0][1] / totalCommits) * 100)
      : 0;
    const top3Commits = sortedAuthors.slice(0, 3).reduce((sum, [, count]) => sum + count, 0);
    const top3Percent = Math.round((top3Commits / totalCommits) * 100);

    let releaseCadence: number | null = null;
    const releases = repoData.releases.nodes;
    if (releases.length >= 2) {
      const releaseDates = releases
        .map((r) => new Date(r.publishedAt || r.createdAt))
        .sort((a, b) => b.getTime() - a.getTime());
      let totalDays = 0;
      for (let i = 0; i < releaseDates.length - 1; i++) {
        totalDays += (releaseDates[i].getTime() - releaseDates[i + 1].getTime()) / (1000 * 60 * 60 * 24);
      }
      releaseCadence = Math.round(totalDays / (releaseDates.length - 1));
    }

    const aliveness: AlivenessMetrics = {
      daysSinceLastCommit,
      commitVelocity: { week: weekCommits, month: monthCommits, quarter: quarterCommits },
      busFactor: { top1Percent, top3Percent },
      releaseCadence,
      issueChurn: {
        opened30: repoData.openedIssues30.totalCount,
        closed30: repoData.closedIssues30.totalCount,
        opened90: repoData.openedIssues90.totalCount,
        closed90: repoData.closedIssues90.totalCount,
      },
    };

    // === CALCULATE CONTRIBUTION OUTCOMES METRICS ===
    const ownerLogin = repoData.owner.login.toLowerCase();
    const mergedPRs = repoData.mergedPRs.nodes;
    const closedPRs = repoData.closedPRs.nodes.filter((pr) => !pr.mergedAt);
    const allClosedPRs = [...mergedPRs, ...closedPRs];

    const totalClosed = allClosedPRs.length;
    const mergedCount = mergedPRs.length;
    const prAcceptanceRate = totalClosed > 0 ? Math.round((mergedCount / totalClosed) * 100) : 0;
    const closedWithoutMergeRate = totalClosed > 0
      ? Math.round((closedPRs.length / totalClosed) * 100)
      : 0;

    const responseTimesHours: number[] = [];
    allClosedPRs.forEach((pr) => {
      const prAuthor = pr.author?.login?.toLowerCase() || "";
      const prCreatedAt = new Date(pr.createdAt);

      const allResponses: ReviewOrComment[] = [
        ...pr.reviews.nodes,
        ...pr.comments.nodes,
      ].filter((item) => item.author?.login && item.author.login.toLowerCase() !== prAuthor);

      if (allResponses.length > 0) {
        const firstResponse = allResponses.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];
        const hours = (new Date(firstResponse.createdAt).getTime() - prCreatedAt.getTime()) / (1000 * 60 * 60);
        if (hours > 0 && hours < 8760) responseTimesHours.push(hours);
      }
    });

    const timeToFirstResponse = responseTimesHours.length > 0
      ? Math.round(responseTimesHours.reduce((a, b) => a + b, 0) / responseTimesHours.length)
      : null;

    const mergeTimesHours: number[] = [];
    mergedPRs.forEach((pr) => {
      if (pr.mergedAt) {
        const hours = (new Date(pr.mergedAt).getTime() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60);
        if (hours > 0 && hours < 8760) mergeTimesHours.push(hours);
      }
    });

    const timeToMerge = mergeTimesHours.length > 0
      ? Math.round(mergeTimesHours.reduce((a, b) => a + b, 0) / mergeTimesHours.length)
      : null;

    let externalPRs = 0;
    allClosedPRs.forEach((pr) => {
      const prAuthor = pr.author?.login?.toLowerCase() || "";
      if (prAuthor && prAuthor !== ownerLogin) externalPRs++;
    });

    const externalContributorShare = totalClosed > 0
      ? Math.round((externalPRs / totalClosed) * 100)
      : 0;

    const contributionOutcomes: ContributionOutcomesMetrics = {
      prAcceptanceRate,
      timeToFirstResponse,
      timeToMerge,
      externalContributorShare,
      closedWithoutMergeRate,
      totalPRs: {
        merged: repoData.mergedPRs.totalCount,
        closed: repoData.closedPRs.totalCount,
        open: repoData.openPRs.totalCount,
      },
    };

    const result: InsightsResponse = { aliveness, contributionOutcomes };

    // Cache result to reduce GitHub API calls
    await setInCache(cacheKey, result, CACHE_TTL.INSIGHTS);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("GitHub GraphQL API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
