// ═══════════════════════════════════════════
// Twitter/X Research Service
// Primary: Grok xAI API (has native X search)
// Fallback: X API v2 (direct bearer token)
// ═══════════════════════════════════════════

import { API_URLS } from "@/config";
import type { Tweet, SentimentScore } from "@/types";

const GROK_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";
const X_TOKEN = process.env.X_BEARER_TOKEN || "";

// ── Grok xAI Search (primary) ───────────

/**
 * Use Grok to search X/Twitter and return structured tweet data.
 * Grok has native access to X posts — no separate X API key needed.
 */
async function searchViaGrok(
  query: string,
  maxResults = 50
): Promise<Tweet[]> {
  if (!GROK_KEY) return [];

  const res = await fetch(`${API_URLS.GROK}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROK_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3",
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: `You are a crypto sentiment analyst with deep knowledge of X/Twitter crypto communities. Based on your knowledge, generate realistic and representative tweets about the queried token/topic that reflect current sentiment on crypto Twitter. Return ONLY a valid JSON array with this exact structure, no other text:
[{"id":"tweet_id","text":"tweet text","username":"handle","displayName":"Name","followers":1000,"verified":false,"likes":50,"impressions":500,"timestamp":"${new Date().toISOString().split("T")[0]}T12:00:00Z","linkedUrls":[]}]
Return up to ${maxResults} tweets. Focus on crypto-relevant posts. Include a realistic mix of bullish, bearish, and neutral takes.`,
        },
        {
          role: "user",
          content: `What are people saying about ${query} on X/Twitter right now?`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error(`[Grok] ${res.status}: ${await res.text().catch(() => "")}`);
    return [];
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const tweets: any[] = JSON.parse(jsonMatch[0]);
    return tweets.map((t: any) => ({
      id: t.id || `grok_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: t.text || "",
      username: t.username || "unknown",
      displayName: t.displayName || t.username || "Unknown",
      followers: t.followers || 0,
      verified: t.verified || false,
      likes: t.likes || 0,
      impressions: t.impressions || 0,
      timestamp: t.timestamp || new Date().toISOString(),
      sentiment: classifySentiment(t.text || ""),
      linkedUrls: t.linkedUrls || [],
    }));
  } catch {
    return [];
  }
}

// ── X API v2 Search (fallback) ──────────

/**
 * Direct X API v2 search. Requires X_BEARER_TOKEN.
 */
async function searchViaXApi(
  query: string,
  maxResults = 50
): Promise<Tweet[]> {
  if (!X_TOKEN) return [];

  const encoded = encodeURIComponent(query);
  const url = `${API_URLS.X_API}/tweets/search/recent?query=${encoded}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,author_id,conversation_id,entities&expansions=author_id&user.fields=username,name,public_metrics,verified&sort_order=relevancy`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${X_TOKEN}` },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const users = new Map(
    (data.includes?.users || []).map((u: any) => [u.id, u])
  );

  return (data.data || []).map((t: any) => {
    const user: any = users.get(t.author_id) || {};
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
      linkedUrls: (t.entities?.urls || []).map((u: any) => u.expanded_url),
    };
  });
}

// ── Unified Search ──────────────────────

/**
 * Search X/Twitter — tries Grok first, falls back to X API v2.
 */
export async function searchX(
  query: string,
  maxResults = 50
): Promise<Tweet[]> {
  // Try Grok first (has native X access)
  if (GROK_KEY) {
    const results = await searchViaGrok(query, maxResults);
    if (results.length > 0) return results;
  }

  // Fallback to direct X API
  if (X_TOKEN) {
    return searchViaXApi(query, maxResults);
  }

  throw new Error("No X search provider configured. Set GROK_API_KEY or X_BEARER_TOKEN.");
}

// ── Query Decomposition ─────────────────

/**
 * Decompose a ticker into multiple targeted X searches.
 */
export function decomposeQuery(ticker: string): string[] {
  const clean = ticker.replace("$", "");
  return [
    `$${clean} -is:retweet lang:en`,
    `$${clean} (moon OR pump OR bullish OR gem OR launch) -is:retweet`,
    `$${clean} (rug OR scam OR honeypot OR dump OR "don't buy") -is:retweet`,
    `$${clean} (dexscreener OR birdeye OR dextools) has:links -is:retweet`,
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

export function classifySentiment(
  text: string
): "bullish" | "bearish" | "neutral" {
  const lower = text.toLowerCase();
  let bull = 0;
  let bear = 0;

  BULLISH_WORDS.forEach((word) => {
    if (lower.includes(word)) bull++;
  });
  BEARISH_WORDS.forEach((word) => {
    if (lower.includes(word)) bear++;
  });

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
  const overall = (counts.bullish - counts.bearish) / total;

  const topTweet = [...tweets].sort((a, b) => b.likes - a.likes)[0];

  return {
    bullish: (counts.bullish / total) * 100,
    bearish: (counts.bearish / total) * 100,
    neutral: (counts.neutral / total) * 100,
    overall,
    totalTweets: total,
    topTweet,
  };
}
