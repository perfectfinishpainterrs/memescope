// ═══════════════════════════════════════════
// Token Data Service
// Aggregates price, volume, liquidity from
// DEXScreener, Birdeye, and GeckoTerminal
// ═══════════════════════════════════════════

import { API_URLS } from "@/config";
import type { TokenData, PricePoint, VolumePoint } from "@/types";

// ── DEXScreener (free, no key needed) ───

/**
 * Get token pair data from DEXScreener.
 * Returns: price, volume, liquidity, txns, price change.
 */
export async function getDexScreenerData(tokenAddress: string) {
  const res = await fetch(
    `${API_URLS.DEXSCREENER}/dex/tokens/${tokenAddress}`,
    { next: { revalidate: 30 } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const pairs = data.pairs || [];

  // Pick the highest liquidity pair
  const bestPair = pairs.sort(
    (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
  )[0];

  if (!bestPair) return null;

  return {
    price: parseFloat(bestPair.priceUsd || "0"),
    priceChange24h: bestPair.priceChange?.h24 || 0,
    volume24h: bestPair.volume?.h24 || 0,
    txns24h:
      (bestPair.txns?.h24?.buys || 0) + (bestPair.txns?.h24?.sells || 0),
    liquidity: bestPair.liquidity?.usd || 0,
    marketCap: bestPair.marketCap || 0,
    pairAddress: bestPair.pairAddress,
    dexId: bestPair.dexId,
    buys24h: bestPair.txns?.h24?.buys || 0,
    sells24h: bestPair.txns?.h24?.sells || 0,
  };
}

// ── Birdeye (Solana-specific) ───────────

const BIRDEYE_KEY = process.env.BIRDEYE_API_KEY || "";

/**
 * Get token overview from Birdeye.
 * Enhanced holder count and distribution data.
 */
export async function getBirdeyeTokenOverview(tokenAddress: string) {
  if (!BIRDEYE_KEY) return null;

  const res = await fetch(
    `${API_URLS.BIRDEYE}/defi/token_overview?address=${tokenAddress}`,
    {
      headers: {
        "X-API-KEY": BIRDEYE_KEY,
        "x-chain": "solana",
      },
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data.data;
}

/**
 * Get price history from Birdeye.
 */
export async function getBirdeyePriceHistory(
  tokenAddress: string,
  timeframe: "1H" | "4H" | "1D" | "1W" = "1D"
) {
  if (!BIRDEYE_KEY) return [];

  const timeMap = {
    "1H": { type: "1m", time_from: Math.floor(Date.now() / 1000) - 3600 },
    "4H": { type: "5m", time_from: Math.floor(Date.now() / 1000) - 14400 },
    "1D": { type: "15m", time_from: Math.floor(Date.now() / 1000) - 86400 },
    "1W": { type: "1H", time_from: Math.floor(Date.now() / 1000) - 604800 },
  };

  const params = timeMap[timeframe];

  const res = await fetch(
    `${API_URLS.BIRDEYE}/defi/history_price?address=${tokenAddress}&address_type=token&type=${params.type}&time_from=${params.time_from}&time_to=${Math.floor(Date.now() / 1000)}`,
    {
      headers: {
        "X-API-KEY": BIRDEYE_KEY,
        "x-chain": "solana",
      },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.data?.items || []).map((item: any) => ({
    timestamp: new Date(item.unixTime * 1000).toISOString(),
    price: item.value,
  }));
}

// ── GeckoTerminal (free, backup) ────────

/**
 * Get token data from GeckoTerminal as a backup source.
 */
export async function getGeckoTerminalData(
  tokenAddress: string,
  network = "solana"
) {
  const res = await fetch(
    `${API_URLS.GECKO_TERMINAL}/networks/${network}/tokens/${tokenAddress}`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data.data?.attributes;
}

// ── Aggregator ──────────────────────────

/**
 * Get comprehensive token data from all available sources.
 * Falls back gracefully if a source is unavailable.
 */
export async function getTokenData(
  tokenAddress: string,
  chain = "SOL"
): Promise<Partial<TokenData>> {
  const [dexData, birdeyeData] = await Promise.allSettled([
    getDexScreenerData(tokenAddress),
    chain === "SOL" ? getBirdeyeTokenOverview(tokenAddress) : null,
  ]);

  const dex =
    dexData.status === "fulfilled" ? dexData.value : null;
  const birdeye =
    birdeyeData.status === "fulfilled" ? birdeyeData.value : null;

  return {
    address: tokenAddress,
    price: dex?.price || birdeye?.price || 0,
    priceChange24h: dex?.priceChange24h || 0,
    volume24h: dex?.volume24h || birdeye?.v24hUSD || 0,
    txns24h: dex?.txns24h || 0,
    liquidity: dex?.liquidity || birdeye?.liquidity || 0,
    marketCap: dex?.marketCap || birdeye?.mc || 0,
  };
}
