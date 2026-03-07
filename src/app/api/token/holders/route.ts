// ═══════════════════════════════════════════
// GET /api/token/holders?address=...&chain=SOL
// Returns holder count, distribution, trend
// Uses Moralis for both SOL and EVM
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  getMoralisSolTopHolders,
  getMoralisEvmTokenHolders,
  getMoralisSolTokenSwaps,
  getMoralisEvmTokenTransfers,
} from "@/lib/blockchain/moralis";
import type { HolderData, HolderBucket, HolderPoint, HolderFlowPoint, Chain } from "@/types";

const MORALIS_KEY = process.env.MORALIS_API_KEY || "";
const HELIUS_KEY = process.env.HELIUS_API_KEY || "";
const HELIUS_RPC = process.env.HELIUS_RPC_URL || "";

/**
 * Count total holders via Helius DAS getTokenAccounts.
 * Fires pages in parallel for speed (~200ms total regardless of holder count).
 */
async function countHeliusHolders(mint: string): Promise<number> {
  const rpcUrl = HELIUS_RPC || (HELIUS_KEY ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}` : "");
  if (!rpcUrl) return 0;

  async function getPage(page: number): Promise<number> {
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: page,
          method: "getTokenAccounts",
          params: { mint, limit: 1000, page },
        }),
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.result?.token_accounts?.length || 0;
    } catch {
      return 0;
    }
  }

  try {
    // First check page 1
    const page1 = await getPage(1);
    if (page1 < 1000) return page1;

    // Fire pages 2-20 in parallel (handles up to 20,000 holders)
    const pages = Array.from({ length: 19 }, (_, i) => i + 2);
    const results = await Promise.all(pages.map(getPage));

    let total = page1;
    for (const count of results) {
      total += count;
      if (count < 1000) break; // found the last page
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Fallback: count holders via Moralis pagination (max 1000).
 */
async function countMoralisHolders(address: string): Promise<number> {
  if (!MORALIS_KEY) return 0;
  try {
    let total = 0;
    let cursor: string | null = null;
    const maxPages = 10;

    for (let page = 0; page < maxPages; page++) {
      const queryStr: string = cursor ? `?cursor=${cursor}` : "";
      const resp: Response = await fetch(
        `https://solana-gateway.moralis.io/token/mainnet/${address}/top-holders${queryStr}`,
        {
          headers: { "X-API-Key": MORALIS_KEY, accept: "application/json" },
          next: { revalidate: 120 },
        }
      );
      if (!resp.ok) break;
      const json: { result?: any[]; cursor?: string; pageSize?: number } = await resp.json();
      const results = json.result || [];
      total += results.length;
      cursor = json.cursor || null;
      if (!cursor || results.length < (json.pageSize || 100)) break;
    }

    return total;
  } catch {
    return 0;
  }
}

const EVM_CHAINS: Chain[] = ["ETH", "BASE", "BSC"];

interface HolderEntry {
  address: string;
  amount: number;
  percentage: number;
}

/**
 * Fetch top holders for SOL via Moralis /top-holders endpoint.
 */
async function getSolHolders(address: string): Promise<{
  topHolders: HolderEntry[];
  totalSupply: number;
}> {
  try {
    const raw = await getMoralisSolTopHolders(address);
    const result = Array.isArray(raw?.result) ? raw.result : Array.isArray(raw) ? raw : [];
    const totalSupply = parseFloat(raw?.totalSupply || "0");

    const topHolders: HolderEntry[] = result.map((h: any) => ({
      address: h.ownerAddress || h.owner_address || "",
      amount: parseFloat(h.balanceFormatted || h.balance || "0"),
      percentage: h.percentageRelativeToTotalSupply ?? 0,
    }));

    return { topHolders, totalSupply };
  } catch {
    return { topHolders: [], totalSupply: 0 };
  }
}

/**
 * Fetch top holders for an EVM token via Moralis owners endpoint.
 */
async function getEvmHolders(address: string, chain: Chain): Promise<{
  topHolders: HolderEntry[];
  totalSupply: number;
}> {
  try {
    const raw = await getMoralisEvmTokenHolders(address, chain);
    const result = Array.isArray(raw?.result) ? raw.result : Array.isArray(raw) ? raw : [];

    let totalSupply = 0;
    const topHolders: HolderEntry[] = result.map((h: any) => {
      const amount = Number(h.balance || 0);
      const pct = Number(h.percentage_relative_to_total_supply || 0);
      totalSupply += amount;
      return {
        address: h.owner_address || h.address || "",
        amount,
        percentage: pct,
      };
    });

    return { topHolders, totalSupply };
  } catch {
    return { topHolders: [], totalSupply: 0 };
  }
}

/**
 * Build holder flow + trend from recent swap data.
 * Groups swaps into time buckets, counts unique buyers/sellers per bucket.
 * Also calculates 24h buyer/seller counts.
 */
function buildFlowFromSwaps(
  swaps: any[],
  currentHolderCount: number
): {
  holderFlow: HolderFlowPoint[];
  holderHistory: HolderPoint[];
  uniqueBuyers24h: number;
  uniqueSellers24h: number;
  holderChange24h: number;
} {
  const empty = {
    holderFlow: [],
    holderHistory: [],
    uniqueBuyers24h: 0,
    uniqueSellers24h: 0,
    holderChange24h: 0,
  };
  if (!swaps || swaps.length === 0) return empty;

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Find the time span of swaps to pick appropriate bucket size
  const timestamps = swaps.map((s) => new Date(s.blockTimestamp).getTime());
  const oldest = Math.min(...timestamps);
  const newest = Math.max(...timestamps);
  const span = newest - oldest;

  // Pick bucket size: aim for 8-20 data points
  let bucketMs: number;
  if (span < 2 * 60 * 60 * 1000) {
    // < 2 hours: 10-minute buckets
    bucketMs = 10 * 60 * 1000;
  } else if (span < 12 * 60 * 60 * 1000) {
    // < 12 hours: 30-minute buckets
    bucketMs = 30 * 60 * 1000;
  } else if (span < 48 * 60 * 60 * 1000) {
    // < 2 days: 2-hour buckets
    bucketMs = 2 * 60 * 60 * 1000;
  } else {
    // > 2 days: 6-hour buckets
    bucketMs = 6 * 60 * 60 * 1000;
  }

  const buckets = new Map<
    number,
    { buyers: Set<string>; sellers: Set<string> }
  >();

  // 24h unique wallets
  const buyers24h = new Set<string>();
  const sellers24h = new Set<string>();

  for (const swap of swaps) {
    const ts = new Date(swap.blockTimestamp).getTime();
    const bucket = Math.floor(ts / bucketMs) * bucketMs;

    if (!buckets.has(bucket)) {
      buckets.set(bucket, { buyers: new Set(), sellers: new Set() });
    }
    const b = buckets.get(bucket)!;
    const wallet = swap.walletAddress || "";

    if (swap.transactionType === "buy") {
      b.buyers.add(wallet);
      if (ts >= oneDayAgo) buyers24h.add(wallet);
    } else {
      b.sellers.add(wallet);
      if (ts >= oneDayAgo) sellers24h.add(wallet);
    }
  }

  // Sort buckets chronologically
  const sorted = [...buckets.entries()].sort((a, b) => a[0] - b[0]);

  const holderFlow: HolderFlowPoint[] = sorted.map(([ts, data]) => ({
    timestamp: new Date(ts).toISOString(),
    inflow: data.buyers.size,
    outflow: data.sellers.size,
  }));

  // Build holder trend: work backwards from current holder count
  // Net flow per bucket tells us the delta
  const netFlows = sorted.map(([, data]) => data.buyers.size - data.sellers.size);
  const totalNetFlow = netFlows.reduce((sum, n) => sum + n, 0);

  // The count at the start of our data = currentCount - totalNetFlow
  let runningCount = Math.max(currentHolderCount - totalNetFlow, 0);
  const holderHistory: HolderPoint[] = sorted.map(([ts, data], i) => {
    runningCount += netFlows[i];
    return {
      timestamp: new Date(ts).toISOString(),
      count: Math.max(0, runningCount),
    };
  });

  // 24h holder change = net buyers - sellers in last 24h
  const holderChange24h = buyers24h.size - sellers24h.size;

  return {
    holderFlow,
    holderHistory,
    uniqueBuyers24h: buyers24h.size,
    uniqueSellers24h: sellers24h.size,
    holderChange24h,
  };
}

function buildHolderData(
  topHolders: HolderEntry[],
  holderFlow: HolderFlowPoint[],
  holderHistory: HolderPoint[],
  uniqueBuyers24h: number,
  uniqueSellers24h: number,
  holderChange24h: number,
  realTotalHolders?: number
): HolderData {
  const totalHolders = realTotalHolders && realTotalHolders > topHolders.length
    ? realTotalHolders
    : topHolders.length;
  const topHolderPct = topHolders.length > 0 ? topHolders[0].percentage : 0;

  const concentration = topHolders
    .slice(0, 10)
    .reduce((sum, h) => sum + (h.percentage || 0), 0);

  const buckets: Record<string, number> = {
    "Whale (>1%)": 0,
    "Large (0.1-1%)": 0,
    "Medium (0.01-0.1%)": 0,
    "Small (<0.01%)": 0,
  };

  for (const h of topHolders) {
    const pct = h.percentage || 0;
    if (pct > 1) buckets["Whale (>1%)"]++;
    else if (pct > 0.1) buckets["Large (0.1-1%)"]++;
    else if (pct > 0.01) buckets["Medium (0.01-0.1%)"]++;
    else buckets["Small (<0.01%)"]++;
  }

  const distribution: HolderBucket[] = Object.entries(buckets).map(
    ([range, count]) => ({
      range,
      count,
      percentage: totalHolders > 0 ? (count / totalHolders) * 100 : 0,
    })
  );

  const whaleCount = buckets["Whale (>1%)"];
  const whaleAction: "accumulating" | "holding" | "dumping" =
    whaleCount >= 5 ? "accumulating" : whaleCount >= 2 ? "holding" : "dumping";

  // Growth rate based on 24h change
  const growthRate: "growing" | "stable" | "declining" =
    holderChange24h > 5 ? "growing" : holderChange24h < -5 ? "declining" : "stable";

  return {
    totalHolders,
    holderChange24h,
    holderChange7d: 0,
    topHolderPct,
    growthRate,
    uniqueBuyers24h,
    uniqueSellers24h,
    concentration,
    whaleAction,
    distribution,
    holderHistory,
    holderFlow,
  };
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  const chain = (request.nextUrl.searchParams.get("chain") || "SOL") as Chain;

  if (!address) {
    return NextResponse.json(
      { error: "Token address required" },
      { status: 400 }
    );
  }

  try {
    // Fetch holders + swaps in parallel (first page only for speed)
    const [holdersResult, swapsResult] = await Promise.allSettled([
      EVM_CHAINS.includes(chain)
        ? getEvmHolders(address, chain)
        : getSolHolders(address),
      EVM_CHAINS.includes(chain)
        ? getMoralisEvmTokenTransfers(address, chain, 100)
        : getMoralisSolTokenSwaps(address, "mainnet", 5),
    ]);

    const data =
      holdersResult.status === "fulfilled"
        ? holdersResult.value
        : { topHolders: [], totalSupply: 0 };

    const rawSwaps =
      swapsResult.status === "fulfilled" ? swapsResult.value : null;

    const swapList = Array.isArray(rawSwaps?.result)
      ? rawSwaps.result
      : Array.isArray(rawSwaps)
        ? rawSwaps
        : [];

    // Get real holder count (SOL only): try Helius first (accurate), fall back to Moralis
    let realHolderCount = data.topHolders.length;
    if (!EVM_CHAINS.includes(chain)) {
      const heliusCount = await countHeliusHolders(address);
      if (heliusCount > 0) {
        realHolderCount = heliusCount;
      } else if (data.topHolders.length >= 100) {
        const moralisCount = await countMoralisHolders(address);
        if (moralisCount > realHolderCount) realHolderCount = moralisCount;
      }
    }

    const { holderFlow, holderHistory, uniqueBuyers24h, uniqueSellers24h, holderChange24h } =
      buildFlowFromSwaps(swapList, realHolderCount);

    const holderData = buildHolderData(
      data.topHolders,
      holderFlow,
      holderHistory,
      uniqueBuyers24h,
      uniqueSellers24h,
      holderChange24h,
      realHolderCount
    );

    return NextResponse.json(holderData, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
