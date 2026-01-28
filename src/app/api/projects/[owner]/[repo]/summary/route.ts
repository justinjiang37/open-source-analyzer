import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { AlivenessMetrics, ContributionOutcomesMetrics } from "@/lib/mock-data";
import { getFromCache, setInCache, getCacheKey } from "@/lib/cache";
import { CACHE_TTL, CACHE_PREFIX } from "@/lib/redis";

// -----------------------------------------------------------------------------
// Gemini AI Client
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

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

  // Clone request to read body for cache decision
  const body: SummaryRequest = await request.json();
  const hasUserPreferences = body.userPreferences && Object.keys(body.userPreferences).length > 0;

  // -----------------------------------------------------------------------------
  // Redis Cache Check (only for non-personalized requests)
  // Personalized summaries are not cached as they vary per user
  // -----------------------------------------------------------------------------
  const cacheKey = getCacheKey(CACHE_PREFIX.SUMMARY, owner, repo);

  if (!hasUserPreferences) {
    // Attempt to retrieve cached summary from Redis
    // Returns null if not found or on connection error (graceful degradation)
    const cached = await getFromCache<string>(cacheKey);
    if (cached) {
      // Cache hit - return cached summary with appropriate headers
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
    const { aliveness, contributionOutcomes, projectName, projectDescription, projectLanguage, userPreferences } = body;

    // Build user context section if preferences are provided
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

    // Build personalized instruction if user context is available
    const personalizedInstruction = userContextSection
      ? `

After the project summary, add a "Fit Assessment" section (1-2 sentences) evaluating how well this project matches the contributor's profile. Consider:
- Language match (does the project use languages they know?)
- Experience alignment (is the project complexity appropriate?)
- Contribution type availability (are there opportunities matching their preferences?)
- Time commitment fit (does the project's pace match their availability?)
- Rejection risk (given PR acceptance rates and their tolerance)`
      : "";

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

    const response = await withRetry(async () => {
      return await client.models.generateContent({
        model: "models/gemini-2.5-flash",
        contents: prompt,
      });
    });

    const summary = response.text || "Unable to generate summary.";

    // -----------------------------------------------------------------------------
    // Store Result in Redis Cache (only for non-personalized summaries)
    // Cache for 5 minutes (300 seconds) to reduce Gemini API calls and costs
    // Personalized summaries are not cached as they vary per user
    // -----------------------------------------------------------------------------
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
