import { Octokit } from "octokit";
import { NextRequest, NextResponse } from "next/server";
import { AlivenessMetrics } from "@/lib/mock-data";
import { getFromCache, setInCache, getCacheKey } from "@/lib/cache";
import { CACHE_TTL, CACHE_PREFIX } from "@/lib/redis";

// GitHub API client (GraphQL) for repo health metrics
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const octokit = new Octokit({
  auth: GITHUB_TOKEN || undefined,
});

// Dynamic route params: /api/projects/:owner/:repo/aliveness
interface RouteParams {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

// GraphQL query that fetches commit/release/issue data needed for “aliveness”
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

// Fetch aliveness metrics for a given repo
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { owner, repo } = await params;

  // Try cache first (fast path): aliveness:<owner>/<repo>
  const cacheKey = getCacheKey(CACHE_PREFIX.ALIVENESS, owner, repo);

  const cached = await getFromCache<AlivenessMetrics>(cacheKey);
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
    // Compute time windows used by the GraphQL query (7d / 30d / 90d)
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch raw repo activity data from GitHub GraphQL
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

    // Commit recency: days since last push
    const pushedAt = new Date(repoData.pushedAt);
    const daysSinceLastCommit = Math.floor(
      (now.getTime() - pushedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Commit velocity: commits in the last week/month/quarter
    const commitHistory = repoData.defaultBranchRef?.target;
    const weekCommits = commitHistory?.last7?.totalCount ?? 0;
    const monthCommits = commitHistory?.last30?.totalCount ?? 0;
    const quarterCommits = commitHistory?.history?.totalCount ?? 0;

    // Bus factor: how concentrated commits are among top contributors
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

    // Release cadence: average days between recent releases (if any)
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

    // Final “aliveness” metrics returned to the UI
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

    // Cache result to reduce GitHub API calls
    await setInCache(cacheKey, metrics, CACHE_TTL.ALIVENESS);

    // Cache miss
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
