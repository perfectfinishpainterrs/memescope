// ═══════════════════════════════════════════
// GET /api/token/orderbook?address=...
// Order book sniffer — analyzes last 100 swaps
// for whale activity, suspicious patterns, wash trading
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { API_URLS } from "@/config";

const MORALIS_KEY = process.env.MORALIS_API_KEY || "";
const SOL_MINT = "So11111111111111111111111111111111111111112";

interface SwapEntry {
  hash: string;
  wallet: string;
  type: "buy" | "sell";
  subCategory: string;
  tokenAmount: number;
  solAmount: number;
  usdValue: number;
  timestamp: string;
  blockNumber: number;
  exchange: string;
}

interface WalletActivity {
  wallet: string;
  buys: number;
  sells: number;
  totalBoughtUsd: number;
  totalSoldUsd: number;
  totalBoughtTokens: number;
  totalSoldTokens: number;
  netUsd: number;
  firstSeen: string;
  lastSeen: string;
  txCount: number;
}

interface Alert {
  type: "whale_buy" | "whale_sell" | "wash_trade" | "rapid_dump" | "sniper" | "coordinated" | "split_sell";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  wallet?: string;
  usdValue?: number;
  timestamp?: string;
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  if (!MORALIS_KEY) {
    return NextResponse.json({ error: "MORALIS_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${API_URLS.MORALIS_SOL}/token/mainnet/${address}/swaps?limit=100`,
      {
        headers: { "X-API-Key": MORALIS_KEY, accept: "application/json" },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Moralis ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const rawSwaps = data?.result || [];

    // Parse swaps
    const swaps: SwapEntry[] = rawSwaps.map((s: any) => {
      const isBuy = s.transactionType === "buy";
      const tokenObj = isBuy ? (s.bought || {}) : (s.sold || {});
      const solObj = isBuy ? (s.sold || {}) : (s.bought || {});

      return {
        hash: s.transactionHash || "",
        wallet: s.walletAddress || "",
        type: s.transactionType as "buy" | "sell",
        subCategory: s.subCategory || "",
        tokenAmount: parseFloat(tokenObj.amount || "0"),
        solAmount: parseFloat(solObj.amount || "0"),
        usdValue: s.totalValueUsd || 0,
        timestamp: s.blockTimestamp || "",
        blockNumber: s.blockNumber || 0,
        exchange: s.exchangeName || "",
      };
    });

    if (swaps.length === 0) {
      return NextResponse.json({
        address,
        totalSwaps: 0,
        swaps: [],
        wallets: [],
        alerts: [],
        summary: { buys: 0, sells: 0, buyVolume: 0, sellVolume: 0, uniqueWallets: 0, avgTradeSize: 0, largestTrade: 0, timeSpanMinutes: 0 },
      });
    }

    // ── Aggregate by wallet ──
    const walletMap = new Map<string, WalletActivity>();
    for (const s of swaps) {
      if (!walletMap.has(s.wallet)) {
        walletMap.set(s.wallet, {
          wallet: s.wallet,
          buys: 0, sells: 0,
          totalBoughtUsd: 0, totalSoldUsd: 0,
          totalBoughtTokens: 0, totalSoldTokens: 0,
          netUsd: 0,
          firstSeen: s.timestamp, lastSeen: s.timestamp,
          txCount: 0,
        });
      }
      const w = walletMap.get(s.wallet)!;
      w.txCount++;
      if (s.type === "buy") {
        w.buys++;
        w.totalBoughtUsd += s.usdValue;
        w.totalBoughtTokens += s.tokenAmount;
      } else {
        w.sells++;
        w.totalSoldUsd += s.usdValue;
        w.totalSoldTokens += s.tokenAmount;
      }
      w.netUsd = w.totalSoldUsd - w.totalBoughtUsd;
      if (s.timestamp < w.firstSeen) w.firstSeen = s.timestamp;
      if (s.timestamp > w.lastSeen) w.lastSeen = s.timestamp;
    }

    const wallets = [...walletMap.values()].sort((a, b) => b.txCount - a.txCount);

    // ── Summary stats ──
    const buys = swaps.filter((s) => s.type === "buy");
    const sells = swaps.filter((s) => s.type === "sell");
    const buyVolume = buys.reduce((s, t) => s + t.usdValue, 0);
    const sellVolume = sells.reduce((s, t) => s + t.usdValue, 0);
    const allValues = swaps.map((s) => s.usdValue);
    const avgTradeSize = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const largestTrade = Math.max(...allValues);
    const timestamps = swaps.map((s) => new Date(s.timestamp).getTime());
    const timeSpanMinutes = (Math.max(...timestamps) - Math.min(...timestamps)) / 60000;

    // ── Alert detection ──
    const alerts: Alert[] = [];

    // 1. Whale detection: trades > 5x average
    const whaleThreshold = avgTradeSize * 5;
    for (const s of swaps) {
      if (s.usdValue > whaleThreshold && s.usdValue > 500) {
        alerts.push({
          type: s.type === "buy" ? "whale_buy" : "whale_sell",
          severity: s.usdValue > avgTradeSize * 20 ? "critical" : s.usdValue > avgTradeSize * 10 ? "high" : "medium",
          message: `${s.type === "buy" ? "Whale buy" : "Whale sell"}: $${s.usdValue.toFixed(0)} (${(s.usdValue / avgTradeSize).toFixed(1)}x avg)`,
          wallet: s.wallet,
          usdValue: s.usdValue,
          timestamp: s.timestamp,
        });
      }
    }

    // 2. Wash trading: wallet buys AND sells in same window
    for (const w of wallets) {
      if (w.buys > 0 && w.sells > 0) {
        const overlapUsd = Math.min(w.totalBoughtUsd, w.totalSoldUsd);
        if (overlapUsd > 100) {
          alerts.push({
            type: "wash_trade",
            severity: overlapUsd > 5000 ? "critical" : overlapUsd > 1000 ? "high" : "medium",
            message: `Possible wash trade: bought $${w.totalBoughtUsd.toFixed(0)} and sold $${w.totalSoldUsd.toFixed(0)} (${w.buys}B/${w.sells}S)`,
            wallet: w.wallet,
            usdValue: overlapUsd,
          });
        }
      }
    }

    // 3. Rapid dump: wallet sells multiple times in quick succession
    for (const w of wallets) {
      if (w.sells >= 3) {
        const walletSells = swaps.filter((s) => s.wallet === w.wallet && s.type === "sell");
        const sellTimestamps = walletSells.map((s) => new Date(s.timestamp).getTime()).sort();
        const span = (sellTimestamps[sellTimestamps.length - 1] - sellTimestamps[0]) / 60000;
        if (span < 10 && w.totalSoldUsd > 200) {
          alerts.push({
            type: "rapid_dump",
            severity: w.totalSoldUsd > 5000 ? "critical" : w.totalSoldUsd > 1000 ? "high" : "medium",
            message: `Rapid dump: ${w.sells} sells totaling $${w.totalSoldUsd.toFixed(0)} in ${span.toFixed(1)} min`,
            wallet: w.wallet,
            usdValue: w.totalSoldUsd,
          });
        }
      }
    }

    // 4. Split sells: same wallet, multiple small sells in same block or adjacent blocks
    for (const w of wallets) {
      if (w.sells >= 3) {
        const walletSells = swaps.filter((s) => s.wallet === w.wallet && s.type === "sell");
        const blocks = walletSells.map((s) => s.blockNumber);
        const uniqueBlocks = new Set(blocks);
        if (uniqueBlocks.size < walletSells.length * 0.5) {
          alerts.push({
            type: "split_sell",
            severity: "medium",
            message: `Split selling detected: ${walletSells.length} sells across ${uniqueBlocks.size} blocks — possible bot/MEV`,
            wallet: w.wallet,
            usdValue: w.totalSoldUsd,
          });
        }
      }
    }

    // 5. Sniper detection: buy within first few swaps AND very early timestamp
    if (swaps.length >= 10) {
      const oldestTimestamp = Math.min(...timestamps);
      const earlyBuys = buys.filter((s) => {
        const ts = new Date(s.timestamp).getTime();
        return ts - oldestTimestamp < 60000; // within 1 min of oldest swap in set
      });
      for (const s of earlyBuys) {
        if (s.usdValue > 200) {
          alerts.push({
            type: "sniper",
            severity: s.usdValue > 2000 ? "high" : "medium",
            message: `Possible sniper: $${s.usdValue.toFixed(0)} buy near token launch`,
            wallet: s.wallet,
            usdValue: s.usdValue,
            timestamp: s.timestamp,
          });
        }
      }
    }

    // 6. Coordinated buying: multiple unique wallets buying in same block
    const blockBuyers = new Map<number, Set<string>>();
    for (const s of buys) {
      if (!blockBuyers.has(s.blockNumber)) blockBuyers.set(s.blockNumber, new Set());
      blockBuyers.get(s.blockNumber)!.add(s.wallet);
    }
    for (const [block, buyerSet] of blockBuyers) {
      if (buyerSet.size >= 3) {
        const blockBuySwaps = buys.filter((s) => s.blockNumber === block);
        const totalUsd = blockBuySwaps.reduce((s, t) => s + t.usdValue, 0);
        alerts.push({
          type: "coordinated",
          severity: buyerSet.size >= 5 ? "high" : "medium",
          message: `Coordinated buy: ${buyerSet.size} wallets bought in same block ($${totalUsd.toFixed(0)} total)`,
          usdValue: totalUsd,
          timestamp: blockBuySwaps[0]?.timestamp,
        });
      }
    }

    // Sort alerts by severity
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Top 10 recent swaps for display
    const recentSwaps = swaps.slice(0, 20).map((s) => ({
      hash: s.hash,
      wallet: s.wallet,
      type: s.type,
      subCategory: s.subCategory,
      tokenAmount: s.tokenAmount,
      solAmount: s.solAmount,
      usdValue: s.usdValue,
      timestamp: s.timestamp,
      exchange: s.exchange,
      isWhale: s.usdValue > whaleThreshold,
    }));

    return NextResponse.json({
      address,
      totalSwaps: swaps.length,
      recentSwaps,
      wallets: wallets.slice(0, 20),
      alerts,
      summary: {
        buys: buys.length,
        sells: sells.length,
        buyVolume: Number(buyVolume.toFixed(2)),
        sellVolume: Number(sellVolume.toFixed(2)),
        buyPressure: Number(((buyVolume / (buyVolume + sellVolume || 1)) * 100).toFixed(1)),
        uniqueWallets: wallets.length,
        avgTradeSize: Number(avgTradeSize.toFixed(2)),
        largestTrade: Number(largestTrade.toFixed(2)),
        timeSpanMinutes: Number(timeSpanMinutes.toFixed(1)),
        whaleThreshold: Number(whaleThreshold.toFixed(2)),
      },
    }, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
