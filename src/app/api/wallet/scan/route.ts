// ═══════════════════════════════════════════
// POST /api/wallet/scan
// Scans a wallet and returns positions + data
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  getWalletTokens,
  getWalletTransactions,
  parseTransactions,
  getSolPrice,
} from "@/lib/blockchain/solana";
import {
  getEvmWalletTokens,
  getEvmTokenInfo,
  getEvmTokenPrice,
} from "@/lib/blockchain/evm";
import { getTokenData } from "@/lib/services/token-data";
import { calculateSafetyScore } from "@/lib/scoring/safety";
import { isValidSolanaAddress, isValidEvmAddress } from "@/lib/utils";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { getCachedScan, setCachedScan } from "@/lib/cache";
import { createSupabaseServer } from "@/lib/db/supabase-server";
import type { Chain } from "@/types";

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getIp(request);
    const limit = rateLimit(ip, false);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": String(limit.remaining),
            "X-RateLimit-Reset": String(limit.resetAt),
          },
        }
      );
    }

    const { address, chain } = await request.json();

    // Validate
    if (!address) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    if (chain === "SOL" && !isValidSolanaAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Solana address" },
        { status: 400 }
      );
    }

    if (chain === "EVM" && !isValidEvmAddress(address)) {
      return NextResponse.json(
        { error: "Invalid EVM address" },
        { status: 400 }
      );
    }

    // Check cache
    const cached = await getCachedScan(address, chain || "SOL");
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }

    // ── Solana scan ──
    if (chain === "SOL") {
      // 1. Get all token holdings
      const tokens = await getWalletTokens(address);

      // 2. Get transaction history
      const rawTxns = await getWalletTransactions(address);

      // 3. Get SOL price for USD calculations
      const solPrice = await getSolPrice();

      // 4. For each token, build position data
      //    Moralis returns: { mint, amount, name, symbol, decimals, associatedTokenAddress }
      const tokenList = Array.isArray(tokens) ? tokens : [];
      const positions = await Promise.all(
        tokenList
          .filter((t: any) => Number(t.amount) > 0)
          .slice(0, 20) // limit to top 20 positions
          .map(async (token: any) => {
            const mint = token.mint;
            const txns = parseTransactions(rawTxns, mint, solPrice);
            const tokenData = await getTokenData(mint, "SOL");
            const safetyData = await calculateSafetyScore(mint, "SOL");

            const buys = txns.filter((t) => t.type === "BUY");
            const sells = txns.filter((t) => t.type === "SELL");

            // Use actual balance from Moralis as source of truth
            const rawBalance = Number(token.amount || 0);
            const tokenDecimals = Number(token.decimals || 0);
            const holdings = rawBalance / Math.pow(10, tokenDecimals);

            const totalBought = buys.reduce((s, b) => s + b.amount, 0);
            const invested = buys.reduce((s, b) => s + b.totalUsd, 0);
            const currentPrice = tokenData.price || 0;
            const currentValue = holdings * currentPrice;
            const avgEntry =
              totalBought > 0 ? invested / totalBought : 0;
            const pnl = currentValue - invested;
            const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

            return {
              tokenAddress: mint,
              name: token.name || "Unknown",
              ticker: token.symbol || mint.slice(0, 6),
              chain: "SOL",
              holdings,
              avgEntry,
              currentPrice,
              pnl,
              pnlPct,
              invested,
              currentValue,
              buys,
              sells,
              tokenData,
              holderData: {},
              safetyData,
            };
          })
      );

      // Build wallet summary
      const totalValue = positions.reduce(
        (s, p) => s + p.currentValue,
        0
      );
      const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);
      const totalInvested = positions.reduce(
        (s, p) => s + p.invested,
        0
      );

      const result = {
        wallet: {
          address,
          chain: "SOL",
          totalValue,
          totalPnl,
          totalPnlPct:
            totalInvested > 0
              ? (totalPnl / totalInvested) * 100
              : 0,
          positionCount: positions.length,
          txCount: rawTxns.length,
          winRate:
            positions.filter((p) => p.pnl > 0).length /
            Math.max(positions.length, 1),
          firstSeen: "", // TODO: get from first transaction
        },
        positions,
      };

      // Save to cache
      await setCachedScan(address, "SOL", result, 300);

      // Save to scan_history if authenticated
      try {
        const supabase = await createSupabaseServer();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("scan_history").insert({
            user_id: user.id,
            address,
            chain: "SOL",
          });
        }
      } catch {
        // Auth/history save failure is non-critical
      }

      return NextResponse.json(result, {
        headers: {
          "X-Cache": "MISS",
          "Cache-Control": "private, max-age=30",
        },
      });
    }

    // ── EVM scan (ETH, BASE, BSC) ──
    const evmChains: Chain[] = ["ETH", "BASE", "BSC"];
    if (evmChains.includes(chain)) {
      if (!isValidEvmAddress(address)) {
        return NextResponse.json(
          { error: "Invalid EVM address" },
          { status: 400 }
        );
      }

      // 1. Get all ERC-20 token holdings via Moralis
      const rawTokens = await getEvmWalletTokens(address, chain);
      const tokenList = Array.isArray(rawTokens) ? rawTokens : [];

      // 2. For each token, build position data
      const positions = await Promise.all(
        tokenList
          .slice(0, 20) // limit to top 20 positions
          .map(async (token: any) => {
            const tokenAddr = token.token_address;
            const tokenDecimals = Number(token.decimals || 18);
            const holdings =
              Number(token.balance || 0) / Math.pow(10, tokenDecimals);

            // Get price + on-chain info + safety in parallel
            const [priceResult, infoResult, tokenData, safetyData] =
              await Promise.allSettled([
                getEvmTokenPrice(tokenAddr, chain),
                getEvmTokenInfo(tokenAddr, chain),
                getTokenData(tokenAddr, chain),
                calculateSafetyScore(tokenAddr, chain),
              ]);

            const price =
              priceResult.status === "fulfilled"
                ? priceResult.value?.usdPrice || 0
                : 0;
            const info =
              infoResult.status === "fulfilled" ? infoResult.value : null;
            const tData =
              tokenData.status === "fulfilled" ? tokenData.value : {};
            const safety =
              safetyData.status === "fulfilled" ? safetyData.value : null;

            const currentPrice = price || (tData as any)?.price || 0;
            const currentValue = holdings * currentPrice;

            return {
              tokenAddress: tokenAddr,
              name: token.name || info?.name || "Unknown",
              ticker: token.symbol || info?.symbol || "???",
              chain,
              holdings,
              avgEntry: 0, // EVM tx history parsing not yet implemented
              currentPrice,
              pnl: 0,
              pnlPct: 0,
              invested: 0,
              currentValue,
              buys: [],
              sells: [],
              tokenData: tData,
              holderData: {},
              safetyData: safety || {},
            };
          })
      );

      // Build wallet summary
      const totalValue = positions.reduce(
        (s, p) => s + p.currentValue,
        0
      );

      const result = {
        wallet: {
          address,
          chain,
          totalValue,
          totalPnl: 0,
          totalPnlPct: 0,
          positionCount: positions.length,
          txCount: 0,
          winRate: 0,
          firstSeen: "",
        },
        positions,
      };

      // Save to cache
      await setCachedScan(address, chain, result, 300);

      // Save to scan_history if authenticated
      try {
        const supabase = await createSupabaseServer();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("scan_history").insert({
            user_id: user.id,
            address,
            chain,
          });
        }
      } catch {
        // Auth/history save failure is non-critical
      }

      return NextResponse.json(result, {
        headers: {
          "X-Cache": "MISS",
          "Cache-Control": "private, max-age=30",
        },
      });
    }

    // ── Unsupported chain ──
    return NextResponse.json(
      { error: `Unsupported chain: ${chain}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Wallet scan error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
