// ═══════════════════════════════════════════
// Token Data Service
// Priority: DEXScreener (current) + GeckoTerminal (charts)
// + Moralis (price enhancer when key available)
// ═══════════════════════════════════════════

import { API_URLS } from "@/config";
import type { Chain, TokenData, PricePoint, VolumePoint, MeteoraPool } from "@/types";
import { getMoralisTokenPrice, getMoralisTokenStats } from "@/lib/blockchain/moralis";
import { getEvmTokenPrice } from "@/lib/blockchain/evm";

const EVM_CHAINS: Chain[] = ["ETH", "BASE", "BSC"];
const MORALIS_KEY = process.env.MORALIS_API_KEY || "";

// ── DEXScreener (free, no key needed) ───

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
    name: bestPair.baseToken?.name || null,
    ticker: bestPair.baseToken?.symbol || null,
    chainId: bestPair.chainId || "solana",
  };
}

// ── GeckoTerminal OHLCV (free, primary for charts) ───

const NETWORK_MAP: Record<string, string> = {
  SOL: "solana",
  ETH: "eth",
  BASE: "base",
  BSC: "bsc",
};

/**
 * Get pool address from GeckoTerminal for a token.
 */
async function getGeckoTerminalPool(tokenAddress: string, chain = "SOL") {
  const network = NETWORK_MAP[chain] || "solana";
  try {
    const res = await fetch(
      `${API_URLS.GECKO_TERMINAL}/networks/${network}/tokens/${tokenAddress}/pools?page=1`,
      { next: { revalidate: 120 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pools = data.data || [];
    if (pools.length === 0) return null;
    // Return the first (highest volume) pool address
    return pools[0].attributes?.address || pools[0].id?.split("_")[1] || null;
  } catch {
    return null;
  }
}

/**
 * Get OHLCV data from GeckoTerminal.
 * Returns price history + volume history.
 * Timeframes: minute, hour, day
 */
export async function getGeckoTerminalOHLCV(
  poolAddress: string,
  chain = "SOL",
  timeframe: "minute" | "hour" | "day" = "hour",
  aggregate = 1,
  limit = 48
): Promise<{ priceHistory: PricePoint[]; volumeHistory: VolumePoint[] }> {
  const network = NETWORK_MAP[chain] || "solana";
  try {
    const res = await fetch(
      `${API_URLS.GECKO_TERMINAL}/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return { priceHistory: [], volumeHistory: [] };

    const data = await res.json();
    const candles = data.data?.attributes?.ohlcv_list || [];

    // OHLCV format: [timestamp, open, high, low, close, volume]
    const priceHistory: PricePoint[] = candles
      .map((c: number[]) => ({
        timestamp: new Date(c[0] * 1000).toISOString(),
        price: c[4], // close price
      }))
      .reverse(); // oldest first

    const volumeHistory: VolumePoint[] = candles
      .map((c: number[]) => ({
        timestamp: new Date(c[0] * 1000).toISOString(),
        buyVolume: c[5] / 2, // approximate split
        sellVolume: c[5] / 2,
      }))
      .reverse();

    return { priceHistory, volumeHistory };
  } catch {
    return { priceHistory: [], volumeHistory: [] };
  }
}

/**
 * Get token data from GeckoTerminal.
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

// ── Moralis (when key available) ──────────

async function getMoralisData(tokenAddress: string, chain: string) {
  if (!MORALIS_KEY) return null;
  try {
    if (EVM_CHAINS.includes(chain as Chain)) {
      const data = await getEvmTokenPrice(tokenAddress, chain as Chain);
      return {
        price: data?.usdPrice || 0,
        exchangeName: data?.exchangeName || null,
      };
    }
    const data = await getMoralisTokenPrice(tokenAddress, "mainnet");
    return {
      price: data?.usdPrice || 0,
      exchangeName: data?.exchangeName || null,
    };
  } catch {
    return null;
  }
}

// ── Meteora DLMM Pools (Solana only) ────

export async function getMeteoraPoolData(
  tokenAddress: string
): Promise<MeteoraPool[]> {
  try {
    const res = await fetch(
      `${API_URLS.METEORA_DLMM}/pair/all_by_groups?page=0&limit=5&sort_key=tvl&order_by=desc&search_term=${tokenAddress}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const groups = data?.groups || [];

    const pools: MeteoraPool[] = [];
    for (const group of groups) {
      for (const pair of group.pairs || []) {
        pools.push({
          address: pair.address,
          name: pair.name || "",
          liquidity: parseFloat(pair.liquidity || "0"),
          volume24h: pair.trade_volume_24h || 0,
          fees24h: pair.fees_24h || 0,
          apr: pair.apr || 0,
          binStep: pair.bin_step || 0,
          baseFee: pair.base_fee_percentage || "0",
          reserveX: pair.reserve_x_amount || 0,
          reserveY: pair.reserve_y_amount || 0,
          mintX: pair.mint_x || "",
          mintY: pair.mint_y || "",
          currentPrice: pair.current_price || 0,
          cumulativeVolume: parseFloat(pair.cumulative_trade_volume || "0"),
          cumulativeFees: parseFloat(pair.cumulative_fee_volume || "0"),
          feesByTime: {
            min30: pair.fees?.min_30 || 0,
            hour1: pair.fees?.hour_1 || 0,
            hour4: pair.fees?.hour_4 || 0,
            hour12: pair.fees?.hour_12 || 0,
            hour24: pair.fees?.hour_24 || 0,
          },
          volumeByTime: {
            min30: pair.volume?.min_30 || 0,
            hour1: pair.volume?.hour_1 || 0,
            hour4: pair.volume?.hour_4 || 0,
            hour12: pair.volume?.hour_12 || 0,
            hour24: pair.volume?.hour_24 || 0,
          },
        });
      }
    }

    // Sort by liquidity descending
    pools.sort((a, b) => b.liquidity - a.liquidity);
    return pools;
  } catch {
    return [];
  }
}

// ── Aggregator ──────────────────────────

/**
 * Get comprehensive token data from all available sources.
 * Priority: DEXScreener (current data) + GeckoTerminal (charts)
 * + Moralis (price enhancer when key set)
 */
export async function getTokenData(
  tokenAddress: string,
  chain = "SOL"
): Promise<Partial<TokenData>> {
  // Step 1: Get current data from DEXScreener + Moralis + Meteora (SOL only)
  const isSolana = chain === "SOL";
  const [dexResult, moralisResult, meteoraResult] = await Promise.allSettled([
    getDexScreenerData(tokenAddress),
    getMoralisData(tokenAddress, chain),
    isSolana ? getMeteoraPoolData(tokenAddress) : Promise.resolve([]),
  ]);

  const dex = dexResult.status === "fulfilled" ? dexResult.value : null;
  const moralis = moralisResult.status === "fulfilled" ? moralisResult.value : null;
  const meteoraPools = meteoraResult.status === "fulfilled" ? meteoraResult.value : [];

  // Step 2: Get chart data from GeckoTerminal OHLCV
  // Use DEXScreener pair address if available, otherwise find pool from GeckoTerminal
  let priceHistory: PricePoint[] = [];
  let volumeHistory: VolumePoint[] = [];

  const poolAddress = dex?.pairAddress || (await getGeckoTerminalPool(tokenAddress, chain));

  if (poolAddress) {
    const ohlcv = await getGeckoTerminalOHLCV(poolAddress, chain, "hour", 1, 48);
    priceHistory = ohlcv.priceHistory;
    volumeHistory = ohlcv.volumeHistory;
  }

  // Use Meteora total liquidity as fallback/supplement
  const meteoraTotalLiq = meteoraPools.reduce((s, p) => s + p.liquidity, 0);

  return {
    address: tokenAddress,
    name: dex?.name || undefined,
    ticker: dex?.ticker || undefined,
    price: moralis?.price || dex?.price || 0,
    priceChange24h: dex?.priceChange24h || 0,
    volume24h: dex?.volume24h || 0,
    txns24h: dex?.txns24h || 0,
    liquidity: dex?.liquidity || meteoraTotalLiq || 0,
    marketCap: dex?.marketCap || 0,
    priceHistory,
    volumeHistory,
    meteoraPools: meteoraPools.length > 0 ? meteoraPools : undefined,
  };
}
