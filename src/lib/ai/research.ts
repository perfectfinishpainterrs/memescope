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
  // Meteora pool data
  meteoraPools?: any[];
  // Orderbook sniffer
  orderbookAlerts?: any[];
  orderbookSummary?: any;
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

  // Meteora Pools
  if (ctx.meteoraPools?.length) {
    lines.push("");
    lines.push("── METEORA DLMM POOLS ──");
    lines.push(`Active Pools: ${ctx.meteoraPools.length}`);
    const totalLiq = ctx.meteoraPools.reduce((s: number, p: any) => s + (p.liquidity || 0), 0);
    const totalVol = ctx.meteoraPools.reduce((s: number, p: any) => s + (p.volume24h || 0), 0);
    const totalFees = ctx.meteoraPools.reduce((s: number, p: any) => s + (p.fees24h || 0), 0);
    lines.push(`Total Meteora Liquidity: $${totalLiq.toLocaleString()}`);
    lines.push(`Total 24h Volume: $${totalVol.toLocaleString()}`);
    lines.push(`Total 24h Fees: $${totalFees.toLocaleString()}`);
    ctx.meteoraPools.slice(0, 3).forEach((p: any) => {
      lines.push(`  ${p.name}: $${(p.liquidity || 0).toLocaleString()} TVL | $${(p.volume24h || 0).toLocaleString()} vol | ${(p.apr || 0).toFixed(1)}% APR | ${p.binStep} bin step | ${p.baseFee}% fee`);
    });
  }

  // Orderbook Sniffer
  if (ctx.orderbookSummary) {
    lines.push("");
    lines.push("── ORDER BOOK SNIFFER ──");
    const ob = ctx.orderbookSummary;
    lines.push(`Buy Pressure: ${ob.buyPressure}% | ${ob.buys} buys ($${ob.buyVolume?.toLocaleString()}) | ${ob.sells} sells ($${ob.sellVolume?.toLocaleString()})`);
    lines.push(`Unique Wallets: ${ob.uniqueWallets} | Avg Trade: $${ob.avgTradeSize?.toFixed(0)} | Largest: $${ob.largestTrade?.toFixed(0)}`);
    lines.push(`Time Span: ${ob.timeSpanMinutes?.toFixed(0)} minutes`);
    if (ctx.orderbookAlerts?.length) {
      lines.push(`ALERTS (${ctx.orderbookAlerts.length}):`);
      ctx.orderbookAlerts.slice(0, 10).forEach((a: any) => {
        lines.push(`  [${a.severity.toUpperCase()}] ${a.message}`);
      });
    }
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
          content: `You are a meme coin research analyst embedded in a degen trading terminal. You understand meme coins are speculative plays — your job is to help traders find good entries and exits, not scare them away from every token. Be practical and useful.

Below is all the data we have on ${tokenLabel}. Some sections may be incomplete — that is EXPECTED. Do NOT mention missing data, just work with what's here.

${dataBlock}

Respond with ONLY a valid JSON object (no markdown, no code fences, no extra text). Use this exact structure:

{
  "overview": "What this token is, current price/volume/liquidity state. Reference specific numbers. Set the scene.",
  "chartAnalysis": "Price action analysis: momentum direction, volume strength, liquidity depth. Is it heating up or cooling off? Where might support/resistance be?",
  "holderAnalysis": "Holder count, concentration, whale behavior. Frame it practically — is distribution healthy for this stage? Are whales accumulating or dumping?",
  "sentiment": "Community buzz and hype level. If no Twitter data available, write 'No sentiment data available' and move on.",
  "riskAssessment": "Practical risk factors: liquidity depth (can you actually exit?), holder concentration, any safety red flags. End with rating: LOW RISK, MODERATE, SPICY, or DEGEN TERRITORY.",
  "verdict": "One word: ENTER, HOLD, or PASS. Then one decisive sentence with the reasoning — frame it as opportunity vs risk, not just doom."
}

RULES: Reference specific numbers. Be direct and opinionated. Help the trader make money, not just avoid losing it. Highlight opportunity alongside risk. PASS is for genuinely dead or scammy tokens, not just because it's a meme coin. Never say you need more data. Never break character. This is a live trading tool.`,
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

  // Parse JSON response from Claude
  let parsed: any = {};
  try {
    const cleaned = (text || "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: put raw text in overview
    parsed = { overview: text || "Analysis failed" };
  }

  const query = ctx.ticker ? `$${ctx.ticker}` : ctx.address || "";

  return {
    query,
    timestamp: new Date().toISOString(),
    overview: parsed.overview || "",
    chartAnalysis: parsed.chartAnalysis || "",
    holderAnalysis: parsed.holderAnalysis || "",
    sentiment: parsed.sentiment || "",
    riskAssessment: parsed.riskAssessment || "",
    verdict: parsed.verdict || "",
    keyVoices: "",
    sources: [],
  };
}
