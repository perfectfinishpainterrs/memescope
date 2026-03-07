// ═══════════════════════════════════════════
// GET /api/portfolio?wallet=...
// Returns wallet holdings, PnL, transaction history
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  getMoralisWalletTokens,
  getMoralisWalletBalance,
} from "@/lib/blockchain/moralis";
import { getDexScreenerData } from "@/lib/services/token-data";

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

    // Fetch SOL price
    let solPrice = 0;
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
      );
      const data = await res.json();
      solPrice = data.solana?.usd || 0;
    } catch {}

    const solValue = solBalance * solPrice;

    // Enrich ALL holdings with price data from DexScreener (Moralis doesn't return prices)
    const allMints = holdings.map((h) => h.mint).filter(Boolean);
    const dexResults = await Promise.allSettled(
      allMints.map((mint) => getDexScreenerData(mint))
    );
    dexResults.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value) {
        const h = holdings[i];
        h.priceChange24h = result.value.priceChange24h || 0;
        if (result.value.price) h.price = result.value.price;
        if (h.price) h.usdValue = h.amount * h.price;
      }
    });

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
