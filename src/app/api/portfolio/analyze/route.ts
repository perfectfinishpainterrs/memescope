// ═══════════════════════════════════════════
// POST /api/portfolio/analyze
// AI trade analyzer — reviews wallet activity
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";

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
            content: `You are an elite crypto trading analyst embedded in a portfolio scanner. Below is wallet data from a Solana trader. Some data may be sparse — that's fine. Do NOT mention missing data or ask for more. Analyze what's here and give a brutally honest take.

${dataBlock}

Provide a structured analysis with these exact sections:
1. **Portfolio Grade** — Rate A-F. Diversified or degen? Small portfolio is fine — still grade it.
2. **PnL Analysis** — Winners vs losers from the trade data. Estimate realized PnL where possible. If few trades, analyze the positions themselves.
3. **Trading Patterns** — Buying high/selling low? Taking profits or diamond handing? Chasing pumps? If limited trade history, analyze the current holdings strategy instead.
4. **Risk Assessment** — Concentration risk, suspicious tokens, overexposure. Rate risk LOW/MEDIUM/HIGH.
5. **Recommendations** — Specific actionable advice. Which positions to cut, hold, or add to. Be decisive.
6. **Trader Score** — Rate 1-100. Even a small portfolio gets a score.

RULES: Reference specific tokens and numbers. Be direct and opinionated. Never say you need more data. Never refuse to analyze. Every wallet gets a full assessment regardless of size. This is a live trading tool.`,
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

    // Parse sections
    const getSection = (header: string): string => {
      const regex = new RegExp(
        `\\*\\*${header}\\*\\*[:\\s—-]*([\\s\\S]*?)(?=\\n\\d+\\.\\s*\\*\\*|$)`,
        "i"
      );
      const match = (text || "").match(regex);
      return match?.[1]?.trim() || "";
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      portfolioGrade: getSection("Portfolio Grade"),
      pnlAnalysis: getSection("PnL Analysis"),
      tradingPatterns: getSection("Trading Patterns"),
      riskAssessment: getSection("Risk Assessment"),
      recommendations: getSection("Recommendations"),
      traderScore: getSection("Trader Score"),
      raw: text,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
