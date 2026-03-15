// ═══════════════════════════════════════════
// GET /api/prices
// Proxies CoinGecko price data (avoids CORS)
// ═══════════════════════════════════════════

import { NextResponse } from "next/server";

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 15_000; // 15s

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
      { cache: "no-store" }
    );

    if (!res.ok) {
      // Return cached data if available, even if stale
      if (cache) return NextResponse.json(cache.data);
      return NextResponse.json({}, { status: res.status });
    }

    const data = await res.json();
    cache = { data, ts: now };
    return NextResponse.json(data);
  } catch {
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({}, { status: 500 });
  }
}
