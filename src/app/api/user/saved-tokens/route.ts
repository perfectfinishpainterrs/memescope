// ═══════════════════════════════════════════
// GET /api/user/saved-tokens
// Returns watchlist items enriched with live
// token data from DEXScreener
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/db/supabase-server";
import { rateLimit } from "@/lib/middleware/rate-limit";

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

interface DexPair {
  priceUsd?: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  liquidity?: { usd?: number };
  marketCap?: number;
  baseToken?: { name?: string; symbol?: string };
  pairAddress?: string;
}

async function fetchDexScreenerData(address: string) {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pairs: DexPair[] = data.pairs || [];

    // Pick the highest-liquidity pair
    const best = pairs.sort(
      (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];

    if (!best) return null;

    return {
      price: parseFloat(best.priceUsd || "0"),
      priceChange24h: best.priceChange?.h24 || 0,
      volume24h: best.volume?.h24 || 0,
      txns24h:
        (best.txns?.h24?.buys || 0) + (best.txns?.h24?.sells || 0),
      liquidity: best.liquidity?.usd || 0,
      marketCap: best.marketCap || 0,
      name: best.baseToken?.name || "Unknown",
      ticker: best.baseToken?.symbol || "???",
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const ip = getIp(request);
  const limit = rateLimit(ip, true);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: watchlist, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!watchlist || watchlist.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch live data for each token in parallel
    const enriched = await Promise.all(
      watchlist.map(async (item) => {
        const liveData = await fetchDexScreenerData(item.token_address);
        return {
          ...item,
          live: liveData || {
            price: 0,
            priceChange24h: 0,
            volume24h: 0,
            txns24h: 0,
            liquidity: 0,
            marketCap: 0,
            name: "Unknown",
            ticker: "???",
          },
        };
      })
    );

    return NextResponse.json(enriched, {
      headers: { "Cache-Control": "private, max-age=15" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
