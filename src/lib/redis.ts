/**
 * Redis Client Configuration
 *
 * This module sets up the Upstash Redis client for serverless environments.
 * Upstash uses HTTP/REST APIs instead of persistent connections, making it
 * ideal for Next.js API routes and Vercel Edge Functions.
 */

import { Redis } from "@upstash/redis";

// -----------------------------------------------------------------------------
// Redis Client Singleton
// -----------------------------------------------------------------------------

/**
 * Singleton Redis client instance.
 * Uses REST API under the hood - no connection pooling needed for serverless.
 * Automatically handles JSON serialization/deserialization.
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// -----------------------------------------------------------------------------
// Cache TTL Constants (in seconds)
// -----------------------------------------------------------------------------

/**
 * Time-to-live values for different cache types.
 * - INSIGHTS/SUMMARY/ALIVENESS/CONTRIBUTION_OUTCOMES: 5 minutes
 *   (GitHub data doesn't change frequently, balances freshness vs API limits)
 * - SEARCH: 1 minute
 *   (Search results are more dynamic, shorter TTL for relevance)
 */
export const CACHE_TTL = {
  INSIGHTS: 300, // 5 minutes - GitHub GraphQL insights data
  SUMMARY: 300, // 5 minutes - AI-generated summaries from Gemini
  ALIVENESS: 300, // 5 minutes - Repository aliveness metrics
  CONTRIBUTION_OUTCOMES: 300, // 5 minutes - Contribution outcome metrics
  SEARCH: 60, // 1 minute - Search results (more dynamic)
} as const;

// -----------------------------------------------------------------------------
// Cache Key Prefixes
// -----------------------------------------------------------------------------

/**
 * Prefixes for organizing cache keys by type.
 * This allows for:
 * - Easy identification of key purpose in Upstash dashboard
 * - Bulk invalidation of specific cache types if needed
 * - Clear namespace separation between different data types
 */
export const CACHE_PREFIX = {
  INSIGHTS: "insights",
  SUMMARY: "summary",
  ALIVENESS: "aliveness",
  CONTRIBUTION_OUTCOMES: "contribution-outcomes",
  SEARCH: "search",
} as const;

// Type helper for cache prefixes
export type CachePrefix = (typeof CACHE_PREFIX)[keyof typeof CACHE_PREFIX];
