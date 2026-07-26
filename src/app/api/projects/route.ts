import { Octokit } from "octokit";
import { NextRequest, NextResponse } from "next/server";
import { getFromCache, setInCache, getCacheKey } from "@/lib/cache";
import { CACHE_TTL, CACHE_PREFIX } from "@/lib/redis";


// GitHub API client (used to search public repos)
const octokit = new Octokit();


// Response shape returned to the frontend (and stored in cache)
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

// Build a stable cache key for a given search query
function getSearchCacheKey(
  search: string,
  language: string,
  sort: string,
  page: string
): string {
  // Combine params into one string, then base64 so it's safe for a Redis key
  const params = `${search}|${language}|${sort}|${page}`;
  const encoded = Buffer.from(params).toString("base64");
  return getCacheKey(CACHE_PREFIX.SEARCH, encoded);
}

export async function GET(request: NextRequest) {
  // Read query params from the request URL
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const language = searchParams.get("language") || "";
  const sort = searchParams.get("sort") || "stars";
  const page = searchParams.get("page") || "1";

  // Cache lookup (fast path)
  const cacheKey = getSearchCacheKey(search, language, sort, page);

  const cached = await getFromCache<SearchResponse>(cacheKey);
  if (cached) {
    // Cache hit: return cached data immediately
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-Cache": "HIT",
      },
    });
  }

  // no cache hit -> use search query instead and find via github api
  try {
    // Build a GitHub search query string
    let query = search ? `${search} in:name,description` : "stars:>10000";
    if (language) {
      query += ` language:${language}`;
    }
    if (!search) {
      query += " stars:>1000";
    }

    // Call GitHub Search API (paged)
    const response = await octokit.rest.search.repos({
      q: query,
      sort: sort as "stars" | "forks" | "updated",
      order: "desc",
      per_page: 10,
      page: parseInt(page),
    });

    // Convert GitHub response into the smaller shape our UI expects
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

    // Cache the result briefly (search data changes frequently)
    await setInCache(cacheKey, result, CACHE_TTL.SEARCH);

    // Cache miss: return fresh data
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
