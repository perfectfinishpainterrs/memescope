// ═══════════════════════════════════════════
// GET /api/portfolio?wallet=...
// Returns wallet holdings, PnL, transaction history
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  getMoralisWalletTokens,
  getMoralisWalletBalance,
} from "@/lib/blockchain/moralis";

interface Holding {
  mint: string;
  name: string;
  symbol: string;
  amount: number;
  decimals: number;
  usdValue: number;
  price: number;
  priceChange24h: number;
  logo: string | null;
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json(
      { error: "wallet address required" },
      { status: 400 }
    );
  }

  try {
    // Fetch tokens + SOL balance in parallel
    const [tokensResult, balanceResult] = await Promise.allSettled([
      getMoralisWalletTokens(wallet),
      getMoralisWalletBalance(wallet),
    ]);

    const rawTokens =
      tokensResult.status === "fulfilled" ? tokensResult.value : [];
    const rawBalance =
      balanceResult.status === "fulfilled" ? balanceResult.value : null;

    const tokenList = Array.isArray(rawTokens)
      ? rawTokens
      : rawTokens?.result || rawTokens?.tokens || [];

    // Parse holdings
    // Moralis returns `amount` already formatted (human-readable) and `amountRaw` as the raw integer
    const holdings: Holding[] = tokenList.map((t: any) => {
      const amount = t.amountRaw
        ? parseFloat(t.amountRaw) / Math.pow(10, t.decimals || 0)
        : parseFloat(t.amount || t.balance || "0");

      return {
        mint: t.mint || t.token_address || t.associatedTokenAddress || "",
        name: t.name || "Unknown",
        symbol: t.symbol || "???",
        amount,
        decimals: t.decimals || 0,
        usdValue: parseFloat(t.usdValue || "0"),
        price: parseFloat(t.usdPrice || "0"),
        priceChange24h: 0,
        logo: t.logo || t.thumbnail || null,
      };
    });

    // Sort by USD value descending
    holdings.sort((a, b) => b.usdValue - a.usdValue);

    // Get SOL balance
    const solBalance = rawBalance?.lamports
      ? parseFloat(rawBalance.lamports) / 1e9
      : rawBalance?.solana
        ? parseFloat(rawBalance.solana)
        : 0;

    // Fetch SOL price — DEXScreener first (no rate limit), CoinGecko fallback
    let solPrice = 0;
    try {
      const dexRes = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112"
      );
      if (dexRes.ok) {
        const dexData = await dexRes.json();
        const solPair = dexData.pairs?.find(
          (p: any) => p.quoteToken?.symbol === "USDC" || p.quoteToken?.symbol === "USDT"
        );
        solPrice = solPair ? parseFloat(solPair.priceUsd || "0") : 0;
      }
    } catch {}
    if (!solPrice) {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        if (res.ok) {
          const data = await res.json();
          solPrice = data.solana?.usd || 0;
        }
      } catch {}
    }

    const solValue = solBalance * solPrice;

    // Enrich holdings with price data from DexScreener
    // DEXScreener supports batch lookup: up to 30 addresses comma-separated
    const allMints = holdings.map((h) => h.mint).filter(Boolean);
    const BATCH_SIZE = 30;
    const dexMap = new Map<string, any>();

    for (let i = 0; i < allMints.length; i += BATCH_SIZE) {
      const batch = allMints.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${batch.join(",")}`,
          { next: { revalidate: 30 } }
        );
        if (res.ok) {
          const data = await res.json();
          const pairs = data.pairs || [];
          // Group by base token, pick highest liquidity pair per token
          for (const pair of pairs) {
            const addr = pair.baseToken?.address;
            if (!addr) continue;
            const existing = dexMap.get(addr);
            if (!existing || (pair.liquidity?.usd || 0) > (existing.liquidity?.usd || 0)) {
              dexMap.set(addr, pair);
            }
          }
        }
      } catch {}
    }

    // Apply enrichment
    for (const h of holdings) {
      const pair = dexMap.get(h.mint);
      if (pair) {
        h.priceChange24h = pair.priceChange?.h24 || 0;
        const dexPrice = parseFloat(pair.priceUsd || "0");
        if (dexPrice) h.price = dexPrice;
        if (h.price) h.usdValue = h.amount * h.price;
      }
    }

    // Re-sort after enrichment
    holdings.sort((a, b) => b.usdValue - a.usdValue);

    // Total portfolio value
    const totalTokenValue = holdings.reduce((sum, h) => sum + h.usdValue, 0);
    const totalValue = totalTokenValue + solValue;

    return NextResponse.json({
      wallet,
      solBalance,
      solPrice,
      solValue,
      totalValue,
      holdingCount: holdings.length,
      holdings: holdings.filter((h) => h.amount > 0),
      allHoldings: holdings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
