// ═══════════════════════════════════════════
// GET  /api/token/memory?address=...&chain=... — get one token
// GET  /api/token/memory                       — get all tokens
// POST /api/token/memory                       — save token data
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  saveTokenMemory,
  getTokenMemory,
  getAllTokenMemory,
  getMemoryStats,
} from "@/lib/services/token-memory";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  const chain = request.nextUrl.searchParams.get("chain") || "SOL";

  if (address) {
    const entry = getTokenMemory(address, chain);
    if (!entry) {
      return NextResponse.json({ error: "Token not found in memory" }, { status: 404 });
    }
    return NextResponse.json(entry);
  }

  // Return all tokens + stats
  const tokens = getAllTokenMemory();
  const stats = getMemoryStats();
  return NextResponse.json({ stats, tokens });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.address) {
      return NextResponse.json({ error: "address required" }, { status: 400 });
    }

    const saved = saveTokenMemory({
      address: body.address,
      chain: body.chain || "SOL",
      name: body.name,
      ticker: body.ticker,
      price: body.price,
      priceChange24h: body.priceChange24h,
      volume24h: body.volume24h,
      liquidity: body.liquidity,
      marketCap: body.marketCap,
      totalHolders: body.totalHolders,
      topHolderPct: body.topHolderPct,
      concentration: body.concentration,
      whaleAction: body.whaleAction,
      holderChange24h: body.holderChange24h,
      uniqueBuyers24h: body.uniqueBuyers24h,
      uniqueSellers24h: body.uniqueSellers24h,
      safetyScore: body.safetyScore,
      safetyGrade: body.safetyGrade,
      safetyFlags: body.safetyFlags,
      safetyPositives: body.safetyPositives,
      sentimentBullish: body.sentimentBullish,
      sentimentBearish: body.sentimentBearish,
      sentimentNeutral: body.sentimentNeutral,
      sentimentOverall: body.sentimentOverall,
      totalTweets: body.totalTweets,
      topTweets: body.topTweets,
      research: body.research,
    });

    return NextResponse.json(saved);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
