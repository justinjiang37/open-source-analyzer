import { Octokit } from "octokit";
import { NextRequest, NextResponse } from "next/server";
import { getFromCache, setInCache, getCacheKey } from "@/lib/cache";
import { CACHE_TTL, CACHE_PREFIX } from "@/lib/redis";

// -----------------------------------------------------------------------------
// GitHub API Client
// -----------------------------------------------------------------------------

const octokit = new Octokit();

// -----------------------------------------------------------------------------
// Response Types
// -----------------------------------------------------------------------------

interface SearchResponse {
  projects: Array<{
    id: string;
    name: string;
    description: string;
    stars: number;
    language: string;
    owner: string;
    ownerAvatarUrl: string;
    lastCommitDate: string;
    url: string;
    forks: number;
    openIssues: number;
  }>;
  total: number;
}

// -----------------------------------------------------------------------------
// Cache Key Generation for Search
// Creates a deterministic cache key from search parameters using base64 encoding
// This ensures consistent keys for the same search parameters
// -----------------------------------------------------------------------------

function getSearchCacheKey(
  search: string,
  language: string,
  sort: string,
  page: string
): string {
  // Combine all search params into a single string, then base64 encode for URL-safe key
  const params = `${search}|${language}|${sort}|${page}`;
  const encoded = Buffer.from(params).toString("base64");
  return getCacheKey(CACHE_PREFIX.SEARCH, encoded);
}

export async function GET(request: NextRequest) {
  // -----------------------------------------------------------------------------
  // Extract Search Parameters
  // -----------------------------------------------------------------------------
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const language = searchParams.get("language") || "";
  const sort = searchParams.get("sort") || "stars";
  const page = searchParams.get("page") || "1";

  // -----------------------------------------------------------------------------
  // Redis Cache Check
  // Search results have a shorter TTL (60s) since they're more dynamic
  // -----------------------------------------------------------------------------
  const cacheKey = getSearchCacheKey(search, language, sort, page);

  // Attempt to retrieve cached search results from Redis
  const cached = await getFromCache<SearchResponse>(cacheKey);
  if (cached) {
    // Cache hit - return cached results with appropriate headers
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    // Build query: use search term if provided, otherwise show popular repos
    let query = search ? `${search} in:name,description` : "stars:>10000";
    if (language) {
      query += ` language:${language}`;
    }
    if (!search) {
      query += " stars:>1000";
    }

    // call github api
    const response = await octokit.rest.search.repos({
      q: query,
      sort: sort as "stars" | "forks" | "updated",
      order: "desc",
      per_page: 12,
      page: parseInt(page),
    });

    // -----------------------------------------------------------------------------
    // Transform GitHub Response
    // Extract only the necessary fields for the frontend to reduce payload size
    // -----------------------------------------------------------------------------
    const projects = response.data.items.map((repo) => ({
      id: repo.id.toString(),
      name: repo.name,
      description: repo.description || "No description",
      stars: repo.stargazers_count,
      language: repo.language || "Unknown",
      owner: repo.owner?.login || "Unknown",
      ownerAvatarUrl: repo.owner?.avatar_url || "",
      lastCommitDate: repo.pushed_at || new Date().toISOString(),
      url: repo.html_url,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
    }));

    const result: SearchResponse = { projects, total: response.data.total_count };

    // -----------------------------------------------------------------------------
    // Store Result in Redis Cache
    // Cache for 1 minute (60 seconds) - shorter TTL for search results
    // since repository rankings change more frequently
    // -----------------------------------------------------------------------------
    await setInCache(cacheKey, result, CACHE_TTL.SEARCH);

    // Return fresh data with cache miss header
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("GitHub API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
