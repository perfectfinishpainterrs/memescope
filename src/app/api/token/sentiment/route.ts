// ═══════════════════════════════════════════
// GET /api/token/sentiment?address=...&ticker=...
// Returns Twitter/X sentiment analysis for a token
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  searchX,
  decomposeQuery,
  calculateSentiment,
} from "@/lib/twitter";
import { rateLimit } from "@/lib/middleware/rate-limit";

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function GET(request: NextRequest) {
  const ip = getIp(request);
  const limit = rateLimit(ip, false);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const address = request.nextUrl.searchParams.get("address");
  const ticker = request.nextUrl.searchParams.get("ticker");

  if (!address || !ticker) {
    return NextResponse.json(
      { error: "address and ticker are required" },
      { status: 400 }
    );
  }

  try {
    const queries = decomposeQuery(ticker);

    // Run all sub-queries in parallel, collect tweets
    const results = await Promise.allSettled(
      queries.map((q) => searchX(q, 50))
    );

    // Flatten and deduplicate tweets by id
    const seen = new Set<string>();
    const allTweets = results
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof searchX>>> =>
          r.status === "fulfilled"
      )
      .flatMap((r) => r.value)
      .filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

    const sentiment = calculateSentiment(allTweets);

    return NextResponse.json({
      sentiment,
      tweets: allTweets.slice(0, 50), // Top 50 most relevant
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
