// ═══════════════════════════════════════════
// GET /api/token/data?address=...&chain=SOL
// Returns aggregated token data from all sources
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getTokenData } from "@/lib/services/token-data";
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
  const chain = request.nextUrl.searchParams.get("chain") || "SOL";

  if (!address) {
    return NextResponse.json(
      { error: "Token address required" },
      { status: 400 }
    );
  }

  try {
    const tokenData = await getTokenData(address, chain);
    return NextResponse.json(tokenData, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
