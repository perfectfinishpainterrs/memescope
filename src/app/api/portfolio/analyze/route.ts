// ═══════════════════════════════════════════
// POST /api/portfolio/analyze
// AI trade analyzer — reviews wallet activity
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { checkAiLimit } from "@/lib/middleware/ai-limit";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function POST(request: NextRequest) {
  const ip = getIp(request);
  const limit = rateLimit(ip, true);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Auth + daily AI limit (10/day per user)
  const aiLimit = await checkAiLimit();
  if (!aiLimit.allowed) return aiLimit.error!;

  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { holdings, transactions, solBalance, solValue, totalValue } = body;

  if (!holdings && !transactions) {
    return NextResponse.json({ error: "holdings or transactions required" }, { status: 400 });
  }

  // Build portfolio summary for AI
  const lines: string[] = [];

  lines.push("══ PORTFOLIO OVERVIEW ══");
  lines.push(`Total Portfolio Value: $${(totalValue || 0).toLocaleString()}`);
  lines.push(`SOL Balance: ${(solBalance || 0).toFixed(4)} SOL ($${(solValue || 0).toLocaleString()})`);
  lines.push(`Token Positions: ${holdings?.length || 0}`);

  if (holdings?.length > 0) {
    lines.push("");
    lines.push("══ CURRENT HOLDINGS ══");
    holdings.slice(0, 20).forEach((h: any) => {
      lines.push(
        `${h.symbol || h.name || "???"}: ${h.amount?.toFixed(2)} tokens | $${(h.usdValue || 0).toFixed(2)} | 24h: ${h.priceChange24h >= 0 ? "+" : ""}${(h.priceChange24h || 0).toFixed(1)}%`
      );
    });
  }

  if (transactions?.length > 0) {
    lines.push("");
    lines.push("══ RECENT TRADES ══");

    // Summarize buys/sells
    const buys = transactions.filter((t: any) => t.type === "BUY");
    const sells = transactions.filter((t: any) => t.type === "SELL");
    lines.push(`Total Trades: ${transactions.length} (${buys.length} buys, ${sells.length} sells)`);

    // Group trades by token
    const tokenTrades = new Map<string, any[]>();
    transactions.forEach((t: any) => {
      const key = t.tokenSymbol || t.tokenAddress;
      if (!tokenTrades.has(key)) tokenTrades.set(key, []);
      tokenTrades.get(key)!.push(t);
    });

    lines.push("");
    tokenTrades.forEach((trades, symbol) => {
      const tokenBuys = trades.filter((t: any) => t.type === "BUY");
      const tokenSells = trades.filter((t: any) => t.type === "SELL");
      const totalBought = tokenBuys.reduce((s: number, t: any) => s + (t.tokenAmount || 0), 0);
      const totalSold = tokenSells.reduce((s: number, t: any) => s + (t.tokenAmount || 0), 0);
      const totalSpent = tokenBuys.reduce((s: number, t: any) => s + (t.usdValue || 0), 0);
      const totalReceived = tokenSells.reduce((s: number, t: any) => s + (t.usdValue || 0), 0);

      const hasBoth = tokenBuys.length > 0 && tokenSells.length > 0;
      const pnlStr = hasBoth
        ? `PnL: $${(totalReceived - totalSpent).toFixed(2)}`
        : tokenSells.length > 0
          ? "PnL: N/A (buys not in history)"
          : "PnL: N/A (no sells yet)";

      lines.push(`$${symbol}: Bought ${totalBought.toFixed(2)} ($${totalSpent.toFixed(2)}) | Sold ${totalSold.toFixed(2)} ($${totalReceived.toFixed(2)}) | ${pnlStr}`);
    });

    // Show last 15 individual trades
    lines.push("");
    lines.push("Last 15 trades:");
    transactions.slice(0, 15).forEach((t: any) => {
      const date = new Date(t.timestamp).toLocaleString();
      lines.push(
        `  ${t.type} $${t.tokenSymbol} | ${t.tokenAmount?.toFixed(2)} tokens for ${t.quoteAmount?.toFixed(4)} ${t.quoteSymbol} ($${(t.usdValue || 0).toFixed(2)}) | ${date}`
      );
    });
  }

  const dataBlock = lines.join("\n");

  try {
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
            content: `You are a meme coin trading coach embedded in a portfolio scanner. You understand this is speculative degen trading — the user KNOWS it's high risk. Your job is to help them play smarter, not lecture them about risk they already accept.

Below is wallet data from a Solana meme coin trader:

${dataBlock}

Respond with ONLY a valid JSON object (no markdown, no code fences, no extra text). Use this exact structure:

{
  "portfolioGrade": "A-F grade with 2-3 sentence explanation. Grade their STRATEGY, not the fact that they trade meme coins. Are they sizing well? Taking profits? Managing positions?",
  "pnlAnalysis": "Winners vs losers from the trade data. Celebrate the wins, learn from the losses. Reference specific tokens and dollar amounts.",
  "tradingPatterns": "What habits do you see? Good patterns (taking profits, cutting losers fast) AND bad patterns (chasing pumps late, oversizing). Give credit where due.",
  "riskAssessment": "Position sizing, concentration, and liquidity concerns. Frame as practical advice not doom. End with rating: CONSERVATIVE, MODERATE, AGGRESSIVE, or YOLO.",
  "recommendations": "Specific actionable plays. Which positions have momentum, which are dead and should be rotated. Suggest profit-taking levels for winners. Be a helpful trading buddy, not a risk compliance officer.",
  "traderScore": "A number 1-100 followed by a one-sentence justification. 50 = average degen. Score their skill at the game they're playing."
}

RULES: Reference specific tokens and numbers. Be direct and opinionated. Respect the degen lifestyle but help them be BETTER at it. Never lecture about crypto being risky — they know. Focus on actionable alpha. Never say you need more data. Never refuse to analyze. Every wallet gets a full assessment.`,
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

    // Parse JSON response from Claude
    let parsed: any = {};
    try {
      // Strip markdown code fences if Claude added them anyway
      const cleaned = (text || "")
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: return raw text in all fields
      parsed = {
        portfolioGrade: text || "Analysis failed",
        pnlAnalysis: "",
        tradingPatterns: "",
        riskAssessment: "",
        recommendations: "",
        traderScore: "",
      };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      portfolioGrade: parsed.portfolioGrade || "",
      pnlAnalysis: parsed.pnlAnalysis || "",
      tradingPatterns: parsed.tradingPatterns || "",
      riskAssessment: parsed.riskAssessment || "",
      recommendations: parsed.recommendations || "",
      traderScore: parsed.traderScore || "",
      raw: text,
      aiRemaining: aiLimit.remaining,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
