// ═══════════════════════════════════════════
// GET /api/portfolio/transactions?wallet=...
// Returns recent swap history for the wallet
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { API_URLS } from "@/config";

const MORALIS_KEY = process.env.MORALIS_API_KEY || "";
const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  if (!MORALIS_KEY) {
    return NextResponse.json({ error: "MORALIS_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${API_URLS.MORALIS_SOL}/account/mainnet/${wallet}/swaps?limit=100`,
      {
        headers: {
          "X-API-Key": MORALIS_KEY,
          accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Moralis ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const swaps = data?.result || [];

    // Moralis swap structure:
    //   transactionType: "buy" | "sell"
    //   baseToken: string (mint address of the token)
    //   quoteToken: string (SOL mint)
    //   bought: { address, name, symbol, amount, usdPrice, usdAmount }
    //   sold: { address, name, symbol, amount, usdPrice, usdAmount }
    //   pairLabel: "Token/SOL"
    //   totalValueUsd: number

    const transactions = swaps.map((swap: any) => {
      const isBuy = swap.transactionType === "buy";

      // The "token" side is whichever isn't SOL
      const boughtObj = swap.bought || {};
      const soldObj = swap.sold || {};

      // Determine the token (non-SOL side)
      const tokenSide = boughtObj.address !== SOL_MINT ? boughtObj : soldObj;
      const solSide = boughtObj.address === SOL_MINT ? boughtObj : soldObj;

      return {
        hash: swap.transactionHash || "",
        timestamp: swap.blockTimestamp || new Date().toISOString(),
        type: isBuy ? "BUY" : "SELL",
        tokenAddress: tokenSide.address || swap.baseToken || "",
        tokenSymbol: tokenSide.symbol || swap.pairLabel?.split("/")?.[0] || "???",
        tokenName: tokenSide.name || "Unknown",
        tokenAmount: parseFloat(tokenSide.amount || "0"),
        tokenLogo: tokenSide.logo || null,
        quoteSymbol: solSide.symbol || "SOL",
        quoteAmount: parseFloat(solSide.amount || "0"),
        usdValue: swap.totalValueUsd || parseFloat(tokenSide.usdAmount || solSide.usdAmount || "0"),
        exchange: swap.exchangeName || "",
        walletAddress: swap.walletAddress || wallet,
      };
    });

    return NextResponse.json({
      wallet,
      totalTransactions: transactions.length,
      transactions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
