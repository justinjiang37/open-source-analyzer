import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { AlivenessMetrics, ContributionOutcomesMetrics } from "@/lib/mock-data";
import { getFromCache, setInCache, getCacheKey } from "@/lib/cache";
import { CACHE_TTL, CACHE_PREFIX } from "@/lib/redis";

/**
 * POST /api/projects/:owner/:repo/summary
 *
 * Generates a short AI summary of a repo using the already-computed metrics.
 * Uses Redis caching for non-personalized summaries to reduce Gemini calls/cost.
 */

// Gemini client (server-side only)
const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Retry helper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isRetryable =
        error instanceof Error &&
        (error.message.includes("409") ||
         error.message.includes("429") ||
         error.message.includes("503") ||
         error.message.includes("RESOURCE_EXHAUSTED"));

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s...
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`Gemini API retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

interface RouteParams {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

// Request body shape sent from the UI (metrics + optional user preferences)
interface UserPreferences {
  primaryLanguages?: string[];
  experienceLevel?: string;
  contributionGoals?: string[];
  preferredContributionTypes?: string[];
  timeBudget?: string;
  rejectionTolerance?: string;
}

interface SummaryRequest {
  aliveness: AlivenessMetrics;
  contributionOutcomes: ContributionOutcomesMetrics;
  projectName: string;
  projectDescription?: string;
  projectLanguage?: string;
  userPreferences?: UserPreferences;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { owner, repo } = await params;

  // Read request body and decide whether this is personalized.
  const body: SummaryRequest = await request.json();
  const hasUserPreferences = body.userPreferences && Object.keys(body.userPreferences).length > 0;

  // Cache lookup: only cache non-personalized summaries (same for everyone).
  const cacheKey = getCacheKey(CACHE_PREFIX.SUMMARY, owner, repo);

  if (!hasUserPreferences) {
    const cached = await getFromCache<string>(cacheKey);
    if (cached) {
      // Cache hit
      return NextResponse.json(
        { summary: cached },
        {
          headers: {
            "X-Cache": "HIT",
          },
        }
      );
    }
  }

  try {
    // Pull inputs needed to build the prompt.
    const { aliveness, contributionOutcomes, projectName, projectDescription, projectLanguage, userPreferences } = body;

    // Optional: include user preferences to make the summary personalized.
    let userContextSection = "";
    if (userPreferences && Object.keys(userPreferences).length > 0) {
      const parts: string[] = [];
      if (userPreferences.primaryLanguages?.length) {
        parts.push(`- Known languages: ${userPreferences.primaryLanguages.join(", ")}`);
      }
      if (userPreferences.experienceLevel) {
        parts.push(`- Experience level: ${userPreferences.experienceLevel}`);
      }
      if (userPreferences.contributionGoals?.length) {
        parts.push(`- Goals: ${userPreferences.contributionGoals.join(", ")}`);
      }
      if (userPreferences.preferredContributionTypes?.length) {
        parts.push(`- Preferred contribution types: ${userPreferences.preferredContributionTypes.join(", ")}`);
      }
      if (userPreferences.timeBudget) {
        parts.push(`- Time availability: ${userPreferences.timeBudget}`);
      }
      if (userPreferences.rejectionTolerance) {
        parts.push(`- Rejection tolerance: ${userPreferences.rejectionTolerance}`);
      }
      if (parts.length > 0) {
        userContextSection = `

Contributor Profile:
${parts.join("\n")}`;
      }
    }

    // If personalized, ask the model to add a short “Fit Assessment”.
    const personalizedInstruction = userContextSection
      ? `

After the project summary, add a "Fit Assessment" section (1-2 sentences) evaluating how well this project matches the contributor's profile. Consider:
- Language match (does the project use languages they know?)
- Experience alignment (is the project complexity appropriate?)
- Contribution type availability (are there opportunities matching their preferences?)
- Time commitment fit (does the project's pace match their availability?)
- Rejection risk (given PR acceptance rates and their tolerance)`
      : "";

    // Prompt includes the computed metrics so Gemini can summarize project “health”.
    const prompt = `You are an expert open source software analyst. Analyze the following repository metrics and provide a concise, insightful summary (2-3 sentences) about the health and activity of this project.

Repository: ${owner}/${projectName}
${projectDescription ? `Description: ${projectDescription}` : ""}
${projectLanguage ? `Primary Language: ${projectLanguage}` : ""}

Aliveness Metrics:
- Days since last commit: ${aliveness.daysSinceLastCommit}
- Commit velocity: ${aliveness.commitVelocity.week}/week, ${aliveness.commitVelocity.month}/month, ${aliveness.commitVelocity.quarter}/quarter
- Bus factor: Top contributor does ${aliveness.busFactor.top1Percent}% of commits, top 3 do ${aliveness.busFactor.top3Percent}%
- Release cadence: ${aliveness.releaseCadence !== null ? `${aliveness.releaseCadence} days between releases` : "No regular releases"}
- Issue churn (30d): ${aliveness.issueChurn.opened30} opened, ${aliveness.issueChurn.closed30} closed
- Issue churn (90d): ${aliveness.issueChurn.opened90} opened, ${aliveness.issueChurn.closed90} closed

Contribution Outcomes:
- PR acceptance rate: ${contributionOutcomes.prAcceptanceRate}%
- Time to first response: ${contributionOutcomes.timeToFirstResponse !== null ? `${contributionOutcomes.timeToFirstResponse} hours` : "N/A"}
- Time to merge: ${contributionOutcomes.timeToMerge !== null ? `${contributionOutcomes.timeToMerge} hours` : "N/A"}
- External contributor share: ${contributionOutcomes.externalContributorShare}%
- Closed without merge rate: ${contributionOutcomes.closedWithoutMergeRate}%
- Total PRs: ${contributionOutcomes.totalPRs.merged} merged, ${contributionOutcomes.totalPRs.closed} closed, ${contributionOutcomes.totalPRs.open} open${userContextSection}

Provide a brief, actionable summary highlighting the project's strengths and any potential concerns. Focus on what matters most to potential contributors.${personalizedInstruction}`;

    // Call Gemini (with retry for rate limits/transient errors).
    const response = await withRetry(async () => {
      return await client.models.generateContent({
        model: "models/gemini-3.6-flash",
        contents: prompt,
      });
    });

    const summary = response.text || "Unable to generate summary.";

    // Cache non-personalized summaries so repeated clicks are instant.
    if (!hasUserPreferences) {
      await setInCache(cacheKey, summary, CACHE_TTL.SUMMARY);
    }

    return NextResponse.json(
      { summary, personalized: hasUserPreferences },
      {
        headers: {
          "X-Cache": hasUserPreferences ? "PERSONALIZED" : "MISS",
        },
      }
    );
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary", summary: null },
      { status: 500 }
    );
  }
}
