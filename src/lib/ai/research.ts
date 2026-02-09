// ═══════════════════════════════════════════
// AI Research Service (Phase 6)
// Claude API + web search for research briefings
// ═══════════════════════════════════════════

import type { ResearchBriefing } from "@/types";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

/**
 * Generate an AI research briefing for a meme coin query.
 * Uses Claude with web search to find latest X/Twitter sentiment,
 * on-chain data, and community discussions.
 */
export async function generateResearchBriefing(
  query: string
): Promise<ResearchBriefing> {
  if (!ANTHROPIC_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        },
      ],
      messages: [
        {
          role: "user",
          content: `You are a meme coin research analyst. Research the following query using web search to find the latest Twitter/X discussions, token data, and community sentiment.

Query: "${query}"

Provide a structured briefing with these sections:
1. **Overview** — Current state/narrative of this token or topic
2. **Twitter Sentiment** — What people are saying on X (bullish vs bearish takes)
3. **Key Voices** — Notable accounts discussing this
4. **Risk Assessment** — Red flags, rug indicators, or positive signals
5. **Verdict** — Your overall assessment

Be specific. Mention actual accounts/tweets if found. Include risk warnings. Format with markdown.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content
    ?.map((item: any) => (item.type === "text" ? item.text : ""))
    .filter(Boolean)
    .join("\n");

  // Parse sections from the response
  const sections = parseBriefingSections(text || "");

  return {
    query,
    timestamp: new Date().toISOString(),
    ...sections,
    sources: [], // TODO: extract from search results
  };
}

function parseBriefingSections(text: string) {
  // Simple section parser — splits on markdown headers
  const getSection = (header: string): string => {
    const regex = new RegExp(
      `\\*\\*${header}\\*\\*[:\\s]*([\\s\\S]*?)(?=\\*\\*|$)`,
      "i"
    );
    const match = text.match(regex);
    return match?.[1]?.trim() || "";
  };

  return {
    overview: getSection("Overview") || text.slice(0, 500),
    sentiment: getSection("Twitter Sentiment"),
    keyVoices: getSection("Key Voices"),
    riskAssessment: getSection("Risk Assessment"),
    verdict: getSection("Verdict"),
  };
}
