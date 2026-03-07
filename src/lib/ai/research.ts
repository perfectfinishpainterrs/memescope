// ═══════════════════════════════════════════
// AI Research Service
// Feeds Claude ALL token data for deep analysis
// ═══════════════════════════════════════════

import type { ResearchBriefing } from "@/types";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

interface TokenContext {
  address?: string;
  chain?: string;
  name?: string;
  ticker?: string;
  query?: string;
  // Price data
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  liquidity?: number;
  marketCap?: number;
  // Holder data
  totalHolders?: number;
  topHolderPct?: number;
  concentration?: number;
  whaleAction?: string;
  holderChange24h?: number;
  uniqueBuyers24h?: number;
  uniqueSellers24h?: number;
  // Safety data
  safetyScore?: number;
  safetyGrade?: string;
  safetyFlags?: string[];
  safetyPositives?: string[];
  // Sentiment data
  sentimentBullish?: number;
  sentimentBearish?: number;
  sentimentOverall?: number;
  totalTweets?: number;
  topTweets?: any[];
}

function buildDataBlock(ctx: TokenContext): string {
  const lines: string[] = [];

  if (ctx.name || ctx.ticker) {
    lines.push(`Token: ${ctx.name || "Unknown"} ($${ctx.ticker || "???"})`);
  }
  if (ctx.address) lines.push(`Contract: ${ctx.address}`);
  if (ctx.chain) lines.push(`Chain: ${ctx.chain}`);

  // Price
  if (ctx.price != null) {
    lines.push("");
    lines.push("── PRICE DATA ──");
    lines.push(`Price: $${ctx.price}`);
    if (ctx.priceChange24h != null) lines.push(`24h Change: ${ctx.priceChange24h >= 0 ? "+" : ""}${ctx.priceChange24h.toFixed(2)}%`);
    if (ctx.volume24h != null) lines.push(`24h Volume: $${ctx.volume24h.toLocaleString()}`);
    if (ctx.liquidity != null) lines.push(`Liquidity: $${ctx.liquidity.toLocaleString()}`);
    if (ctx.marketCap != null) lines.push(`Market Cap: $${ctx.marketCap.toLocaleString()}`);
  }

  // Holders
  if (ctx.totalHolders != null) {
    lines.push("");
    lines.push("── HOLDER DATA ──");
    lines.push(`Total Holders: ${ctx.totalHolders.toLocaleString()}`);
    if (ctx.topHolderPct != null) lines.push(`Top Holder: ${ctx.topHolderPct.toFixed(1)}%`);
    if (ctx.concentration != null) lines.push(`Top 10 Concentration: ${ctx.concentration.toFixed(1)}%`);
    if (ctx.whaleAction) lines.push(`Whale Action: ${ctx.whaleAction}`);
    if (ctx.holderChange24h != null) lines.push(`24h Holder Change: ${ctx.holderChange24h >= 0 ? "+" : ""}${ctx.holderChange24h}`);
    if (ctx.uniqueBuyers24h != null) lines.push(`24h Unique Buyers: ${ctx.uniqueBuyers24h}`);
    if (ctx.uniqueSellers24h != null) lines.push(`24h Unique Sellers: ${ctx.uniqueSellers24h}`);
  }

  // Safety
  if (ctx.safetyScore != null) {
    lines.push("");
    lines.push("── SAFETY SCORE ──");
    lines.push(`Score: ${ctx.safetyScore}/100 (${ctx.safetyGrade || "?"})`);
    if (ctx.safetyPositives?.length) lines.push(`Positives: ${ctx.safetyPositives.join(", ")}`);
    if (ctx.safetyFlags?.length) lines.push(`Red Flags: ${ctx.safetyFlags.join(", ")}`);
  }

  // Sentiment
  if (ctx.totalTweets != null && ctx.totalTweets > 0) {
    lines.push("");
    lines.push("── TWITTER SENTIMENT ──");
    lines.push(`Total Tweets Analyzed: ${ctx.totalTweets}`);
    if (ctx.sentimentBullish != null) lines.push(`Bullish: ${ctx.sentimentBullish.toFixed(0)}%`);
    if (ctx.sentimentBearish != null) lines.push(`Bearish: ${(ctx.sentimentBearish ?? 0).toFixed(0)}%`);
    if (ctx.sentimentOverall != null) lines.push(`Overall Score: ${ctx.sentimentOverall.toFixed(2)} (-1 to 1)`);
    if (ctx.topTweets?.length) {
      lines.push("Key tweets:");
      ctx.topTweets.slice(0, 5).forEach((t: any) => {
        lines.push(`  @${t.username}: "${t.text.slice(0, 120)}${t.text.length > 120 ? "..." : ""}" (${t.likes} likes, ${t.sentiment})`);
      });
    }
  }

  return lines.join("\n");
}

export async function generateResearchBriefing(
  ctx: TokenContext
): Promise<ResearchBriefing> {
  if (!ANTHROPIC_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const dataBlock = buildDataBlock(ctx);
  const tokenLabel = ctx.ticker ? `$${ctx.ticker}` : ctx.name || ctx.address || "this token";

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
      messages: [
        {
          role: "user",
          content: `You are a meme coin research analyst embedded in a trading terminal. Below is all the data we have on ${tokenLabel}. Some sections may be incomplete or missing — that is EXPECTED. Do NOT mention missing data, do NOT ask for more data, do NOT refuse to analyze. Work with whatever is provided and give your best assessment.

${dataBlock}

Provide a structured briefing with these exact sections:
1. **Overview** — What this token is, current price/volume/liquidity state. If data is sparse, say what you can infer.
2. **Chart Analysis** — Analyze price action from available numbers: 24h change direction, volume vs market cap ratio, liquidity health. Flag any warning signs.
3. **Holder Analysis** — Analyze holder count, concentration, whale behavior if available. If holder data is limited, note what the available numbers suggest.
4. **Twitter Sentiment** — Summarize community buzz and sentiment. If no Twitter data, skip this section entirely (don't mention it's missing).
5. **Risk Assessment** — Overall risk level using safety scores, holder concentration, liquidity. Give a clear risk rating (LOW/MEDIUM/HIGH/EXTREME).
6. **Verdict** — Your call: BUY / HOLD / AVOID. One decisive sentence why.

RULES: Reference specific numbers. Be direct and opinionated. Never say "I don't have enough data" — just analyze what's there. Never break character. This is a live trading tool.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.content
    ?.map((item: any) => (item.type === "text" ? item.text : ""))
    .filter(Boolean)
    .join("\n");

  const sections = parseBriefingSections(text || "");
  const query = ctx.ticker ? `$${ctx.ticker}` : ctx.address || "";

  return {
    query,
    timestamp: new Date().toISOString(),
    ...sections,
    sources: [],
  };
}

function parseBriefingSections(text: string) {
  const getSection = (header: string): string => {
    const regex = new RegExp(
      `\\*\\*${header}\\*\\*[:\\s—-]*([\\s\\S]*?)(?=\\n\\d+\\.\\s*\\*\\*|$)`,
      "i"
    );
    const match = text.match(regex);
    return match?.[1]?.trim() || "";
  };

  return {
    overview: getSection("Overview") || text.slice(0, 500),
    chartAnalysis: getSection("Chart Analysis"),
    holderAnalysis: getSection("Holder Analysis"),
    sentiment: getSection("Twitter Sentiment"),
    riskAssessment: getSection("Risk Assessment"),
    verdict: getSection("Verdict"),
    keyVoices: "", // kept for type compat
  };
}
