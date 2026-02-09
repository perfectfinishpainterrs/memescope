// ═══════════════════════════════════════════
// POST /api/wallet/scan
// Scans a wallet and returns positions + data
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  getWalletTokens,
  getWalletTransactions,
  parseTransactions,
} from "@/lib/blockchain/solana";
import { getTokenData } from "@/lib/services/token-data";
import { calculateSafetyScore } from "@/lib/scoring/safety";
import { isValidSolanaAddress, isValidEvmAddress } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
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

    // ── Solana scan ──
    if (chain === "SOL") {
      // 1. Get all token holdings
      const tokens = await getWalletTokens(address);

      // 2. Get transaction history
      const rawTxns = await getWalletTransactions(address);

      // 3. For each token, build position data
      const positions = await Promise.all(
        tokens
          .filter((t: any) => t.interface === "FungibleToken")
          .slice(0, 20) // limit to top 20 positions
          .map(async (token: any) => {
            const mint = token.id;
            const txns = parseTransactions(rawTxns, mint);
            const tokenData = await getTokenData(mint, "SOL");
            const safetyData = await calculateSafetyScore(mint, "SOL");

            const buys = txns.filter((t) => t.type === "BUY");
            const sells = txns.filter((t) => t.type === "SELL");

            const totalBought = buys.reduce((s, b) => s + b.amount, 0);
            const totalSold = sells.reduce((s, b) => s + b.amount, 0);
            const holdings = totalBought - totalSold;

            const invested = buys.reduce((s, b) => s + b.totalUsd, 0);
            const currentPrice = tokenData.price || 0;
            const currentValue = holdings * currentPrice;
            const avgEntry =
              totalBought > 0 ? invested / totalBought : 0;
            const pnl = currentValue - invested;
            const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

            return {
              tokenAddress: mint,
              name: token.content?.metadata?.name || "Unknown",
              ticker:
                token.content?.metadata?.symbol || mint.slice(0, 6),
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
              holderData: {}, // TODO: implement
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

      return NextResponse.json({
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
      });
    }

    // ── EVM scan (Phase 8) ──
    return NextResponse.json(
      { error: "EVM support coming soon" },
      { status: 501 }
    );
  } catch (err: any) {
    console.error("Wallet scan error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
