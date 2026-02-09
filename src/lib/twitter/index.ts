// ═══════════════════════════════════════════
// Twitter/X Research Service (Phase 5)
// Implements the x-research-skill pattern:
// multi-query decomposition → search → synthesize
// ═══════════════════════════════════════════

import { API_URLS } from "@/config";
import type { Tweet, SentimentScore } from "@/types";

const X_TOKEN = process.env.X_BEARER_TOKEN || "";

// ── Core Search ─────────────────────────

/**
 * Search X/Twitter API with a query.
 * Returns parsed tweets with metrics.
 */
export async function searchX(
  query: string,
  maxResults = 100
): Promise<Tweet[]> {
  if (!X_TOKEN) {
    throw new Error("X_BEARER_TOKEN not configured");
  }

  const encoded = encodeURIComponent(query);
  const url = `${API_URLS.X_API}/tweets/search/recent?query=${encoded}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,author_id,conversation_id,entities&expansions=author_id&user.fields=username,name,public_metrics,verified&sort_order=relevancy`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${X_TOKEN}` },
  });

  if (!res.ok) {
    throw new Error(`X API error: ${res.status}`);
  }

  const data = await res.json();
  const users = new Map(
    (data.includes?.users || []).map((u: any) => [u.id, u])
  );

  return (data.data || []).map((t: any) => {
    const user = users.get(t.author_id) || {};
    return {
      id: t.id,
      text: t.text,
      username: user.username || "unknown",
      displayName: user.name || "Unknown",
      followers: user.public_metrics?.followers_count || 0,
      verified: user.verified || false,
      likes: t.public_metrics?.like_count || 0,
      impressions: t.public_metrics?.impression_count || 0,
      timestamp: t.created_at,
      sentiment: classifySentiment(t.text),
      linkedUrls: (t.entities?.urls || []).map(
        (u: any) => u.expanded_url
      ),
    };
  });
}

// ── Query Decomposition ─────────────────

/**
 * Decompose a research question into multiple targeted X searches.
 * Models the x-research-skill approach.
 */
export function decomposeQuery(ticker: string): string[] {
  const clean = ticker.replace("$", "");
  return [
    // Core sentiment
    `$${clean} -is:retweet lang:en`,
    // Bullish signals
    `$${clean} (moon OR pump OR bullish OR gem OR launch) -is:retweet`,
    // Bearish / risk signals
    `$${clean} (rug OR scam OR honeypot OR dump OR "don't buy") -is:retweet`,
    // DEX links
    `$${clean} (dexscreener OR birdeye OR dextools) has:links -is:retweet`,
    // Filter out spam
    `$${clean} -airdrop -giveaway -whitelist -is:retweet lang:en`,
  ];
}

// ── Sentiment Classification ────────────

const BULLISH_WORDS = new Set([
  "moon", "pump", "bullish", "gem", "100x", "ape", "buy",
  "launch", "early", "alpha", "send", "flying", "diamond",
  "hold", "accumulate", "breakout", "ath", "parabolic",
]);

const BEARISH_WORDS = new Set([
  "rug", "scam", "dump", "sell", "honeypot", "avoid",
  "fake", "down", "crash", "dead", "exit", "jeet",
  "don't buy", "warning", "red flag", "ponzi",
]);

/**
 * Simple keyword-based sentiment classification.
 * Returns: bullish, bearish, or neutral.
 */
export function classifySentiment(
  text: string
): "bullish" | "bearish" | "neutral" {
  const lower = text.toLowerCase();
  let bull = 0;
  let bear = 0;

  for (const word of BULLISH_WORDS) {
    if (lower.includes(word)) bull++;
  }
  for (const word of BEARISH_WORDS) {
    if (lower.includes(word)) bear++;
  }

  if (bull > bear) return "bullish";
  if (bear > bull) return "bearish";
  return "neutral";
}

/**
 * Calculate aggregate sentiment score for a token.
 */
export function calculateSentiment(tweets: Tweet[]): SentimentScore {
  if (tweets.length === 0) {
    return {
      bullish: 0,
      bearish: 0,
      neutral: 0,
      overall: 0,
      totalTweets: 0,
      topTweet: null,
    };
  }

  const counts = { bullish: 0, bearish: 0, neutral: 0 };
  for (const t of tweets) {
    counts[t.sentiment]++;
  }

  const total = tweets.length;
  const overall =
    (counts.bullish - counts.bearish) / total; // -1 to 1

  const topTweet = [...tweets].sort(
    (a, b) => b.likes - a.likes
  )[0];

  return {
    bullish: counts.bullish / total,
    bearish: counts.bearish / total,
    neutral: counts.neutral / total,
    overall,
    totalTweets: total,
    topTweet,
  };
}
