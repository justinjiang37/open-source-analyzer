/**
 * Cache Utility Functions
 *
 * This module provides a set of utility functions for interacting with Redis cache.
 * All functions implement graceful degradation - cache failures never break requests.
 * Errors are logged but don't throw exceptions, allowing the application to continue
 * functioning even if Redis is unavailable.
 */

import { redis, type CachePrefix } from "./redis";

// -----------------------------------------------------------------------------
// Cache Key Generation
// -----------------------------------------------------------------------------

/**
 * Generates a consistent, namespaced cache key.
 *
 * @param prefix - The cache type prefix (e.g., "insights", "summary")
 * @param parts - Additional key components (e.g., owner, repo name)
 * @returns Formatted cache key like "insights:facebook/react"
 *
 * @example
 * getCacheKey(CACHE_PREFIX.INSIGHTS, "facebook", "react")
 * // Returns: "insights:facebook/react"
 */
export function getCacheKey(prefix: CachePrefix, ...parts: string[]): string {
  return `${prefix}:${parts.join("/")}`;
}

// -----------------------------------------------------------------------------
// Cache Read Operations
// -----------------------------------------------------------------------------

/**
 * Retrieves data from Redis cache with type safety.
 *
 * Implements graceful degradation:
 * - On success: Returns the cached data with proper typing
 * - On failure: Logs error and returns null (request continues without cache)
 *
 * @param key - The cache key to retrieve
 * @returns The cached data or null if not found/error
 *
 * @example
 * const data = await getFromCache<InsightsResponse>("insights:facebook/react");
 * if (data) {
 *   // Cache hit - use cached data
 * } else {
 *   // Cache miss - fetch fresh data
 * }
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    // Upstash automatically deserializes JSON data
    const data = await redis.get<T>(key);
    return data;
  } catch (error) {
    // Log error but don't throw - allows request to continue without cache
    console.error(`[Redis] GET error for key "${key}":`, error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Cache Write Operations
// -----------------------------------------------------------------------------

/**
 * Stores data in Redis cache with automatic expiration.
 *
 * Implements graceful degradation:
 * - On success: Data is cached with the specified TTL
 * - On failure: Logs error silently (request still completes successfully)
 *
 * @param key - The cache key to store under
 * @param data - The data to cache (must be JSON-serializable)
 * @param ttlSeconds - Time-to-live in seconds
 *
 * @example
 * await setInCache("insights:facebook/react", insightsData, CACHE_TTL.INSIGHTS);
 */
export async function setInCache<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  try {
    // Upstash automatically serializes data to JSON
    // { ex: ttlSeconds } sets expiration time in seconds
    await redis.set(key, data, { ex: ttlSeconds });
  } catch (error) {
    // Log error but don't throw - the request already has the data to return
    console.error(`[Redis] SET error for key "${key}":`, error);
  }
}

// -----------------------------------------------------------------------------
// Cache Invalidation
// -----------------------------------------------------------------------------

/**
 * Deletes a specific cache entry.
 *
 * Useful for manual cache invalidation when data is known to have changed.
 * Implements graceful degradation - errors are logged but don't throw.
 *
 * @param key - The cache key to delete
 *
 * @example
 * // Invalidate cache after a known update
 * await deleteFromCache("insights:facebook/react");
 */
export async function deleteFromCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[Redis] DEL error for key "${key}":`, error);
  }
}

/**
 * Deletes multiple cache entries for a specific repository.
 *
 * Useful for bulk invalidation when repository data changes.
 * Deletes all cache types (insights, summary, aliveness, contribution-outcomes) for the repo.
 *
 * @param owner - Repository owner (e.g., "facebook")
 * @param repo - Repository name (e.g., "react")
 *
 * @example
 * // Invalidate all caches for facebook/react
 * await deleteRepoCache("facebook", "react");
 */
export async function deleteRepoCache(owner: string, repo: string): Promise<void> {
  try {
    // Build all possible cache keys for this repository
    const keysToDelete = [
      getCacheKey("insights", owner, repo),
      getCacheKey("summary", owner, repo),
      getCacheKey("aliveness", owner, repo),
      getCacheKey("contribution-outcomes", owner, repo),
    ];

    // Delete all keys in a single operation
    await redis.del(...keysToDelete);
  } catch (error) {
    console.error(`[Redis] DELETE REPO CACHE error for "${owner}/${repo}":`, error);
  }
}

// -----------------------------------------------------------------------------
// Health Check
// -----------------------------------------------------------------------------

/**
 * Checks if Redis connection is healthy.
 *
 * Useful for health check endpoints or debugging connectivity issues.
 *
 * @returns true if Redis is reachable and responding, false otherwise
 *
 * @example
 * if (await isRedisAvailable()) {
 *   console.log("Redis is healthy");
 * } else {
 *   console.warn("Redis is unavailable - requests will bypass cache");
 * }
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const response = await redis.ping();
    return response === "PONG";
  } catch {
    return false;
  }
}
