import { Octokit } from "octokit";
import { NextRequest, NextResponse } from "next/server";
import { AlivenessMetrics } from "@/lib/mock-data";
import { getFromCache, setInCache, getCacheKey } from "@/lib/cache";
import { CACHE_TTL, CACHE_PREFIX } from "@/lib/redis";

// -----------------------------------------------------------------------------
// GitHub API Client
// -----------------------------------------------------------------------------

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const octokit = new Octokit({
  auth: GITHUB_TOKEN || undefined,
});

// -----------------------------------------------------------------------------
// Route Types
// -----------------------------------------------------------------------------

interface RouteParams {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

const ALIVENESS_QUERY = `
  query($owner: String!, $repo: String!, $since90d: GitTimestamp!, $since30d: GitTimestamp!, $since7d: GitTimestamp!, $issuesSince30d: DateTime!, $issuesSince90d: DateTime!) {
    repository(owner: $owner, name: $repo) {
      pushedAt

      # Releases for cadence calculation
      releases(first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          publishedAt
          createdAt
        }
      }

      # Commits in last 90 days for velocity and bus factor
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

            # Commits in last 30 days
            last30: history(first: 100, since: $since30d) {
              totalCount
            }

            # Commits in last 7 days
            last7: history(first: 100, since: $since7d) {
              totalCount
            }
          }
        }
      }

      # Issues opened in last 30 days
      openedIssues30: issues(filterBy: {since: $issuesSince30d}) {
        totalCount
      }

      # Issues opened in last 90 days
      openedIssues90: issues(filterBy: {since: $issuesSince90d}) {
        totalCount
      }

      # Closed issues - we'll filter by date in the query
      closedIssues30: issues(states: CLOSED, filterBy: {since: $issuesSince30d}) {
        totalCount
      }

      closedIssues90: issues(states: CLOSED, filterBy: {since: $issuesSince90d}) {
        totalCount
      }
    }
  }
`;

interface GraphQLResponse {
  repository: {
    pushedAt: string;
    releases: {
      nodes: Array<{
        publishedAt: string | null;
        createdAt: string;
      }>;
    };
    defaultBranchRef: {
      target: {
        history: {
          totalCount: number;
          nodes: Array<{
            author: {
              user: { login: string } | null;
              name: string | null;
            };
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
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { owner, repo } = await params;

  // -----------------------------------------------------------------------------
  // Redis Cache Check
  // Build cache key using prefix for namespace organization (e.g., "aliveness:facebook/react")
  // -----------------------------------------------------------------------------
  const cacheKey = getCacheKey(CACHE_PREFIX.ALIVENESS, owner, repo);

  // Attempt to retrieve cached metrics from Redis
  // Returns null if not found or on connection error (graceful degradation)
  const cached = await getFromCache<AlivenessMetrics>(cacheKey);
  if (cached) {
    // Cache hit - return cached data with appropriate headers
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const response = await octokit.graphql<GraphQLResponse>(ALIVENESS_QUERY, {
      owner,
      repo,
      since90d: ninetyDaysAgo.toISOString(),
      since30d: thirtyDaysAgo.toISOString(),
      since7d: sevenDaysAgo.toISOString(),
      issuesSince30d: thirtyDaysAgo.toISOString(),
      issuesSince90d: ninetyDaysAgo.toISOString(),
    });

    const repoData = response.repository;

    // Calculate days since last commit
    const pushedAt = new Date(repoData.pushedAt);
    const daysSinceLastCommit = Math.floor(
      (now.getTime() - pushedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Commit velocity
    const commitHistory = repoData.defaultBranchRef?.target;
    const weekCommits = commitHistory?.last7?.totalCount ?? 0;
    const monthCommits = commitHistory?.last30?.totalCount ?? 0;
    const quarterCommits = commitHistory?.history?.totalCount ?? 0;

    // Bus factor calculation
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

    // Release cadence
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

    const metrics: AlivenessMetrics = {
      daysSinceLastCommit,
      commitVelocity: {
        week: weekCommits,
        month: monthCommits,
        quarter: quarterCommits,
      },
      busFactor: {
        top1Percent,
        top3Percent,
      },
      releaseCadence,
      issueChurn: {
        opened30: repoData.openedIssues30.totalCount,
        closed30: repoData.closedIssues30.totalCount,
        opened90: repoData.openedIssues90.totalCount,
        closed90: repoData.closedIssues90.totalCount,
      },
    };

    // -----------------------------------------------------------------------------
    // Store Result in Redis Cache
    // Cache for 5 minutes (300 seconds) to reduce GitHub API calls
    // Errors are logged but don't affect the response (graceful degradation)
    // -----------------------------------------------------------------------------
    await setInCache(cacheKey, metrics, CACHE_TTL.ALIVENESS);

    // Return fresh data with cache miss header
    return NextResponse.json(metrics, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("GitHub GraphQL API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch aliveness metrics" },
      { status: 500 }
    );
  }
}
