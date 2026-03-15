// ═══════════════════════════════════════════
// GET /api/portfolio/transactions?wallet=...
// Returns recent swap history using Helius parsed transactions
// Supports: pump.fun, pump AMM, Jupiter, Raydium, Orca, etc.
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  if (!HELIUS_API_KEY) {
    return NextResponse.json({ error: "HELIUS_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Use Helius enhanced transactions API with SWAP filter
    // This is cleaner than getting all sigs then parsing — directly returns only swaps
    const allSwaps: any[] = [];
    let beforeSig: string | undefined;
    const MAX_PAGES = 5;

    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL(
        `https://api.helius.xyz/v0/addresses/${wallet}/transactions`
      );
      url.searchParams.set("api-key", HELIUS_API_KEY);
      url.searchParams.set("limit", "100");
      url.searchParams.set("type", "SWAP");
      if (beforeSig) url.searchParams.set("before", beforeSig);

      const res = await fetch(url.toString());
      if (!res.ok) {
        if (page === 0) {
          return NextResponse.json(
            { error: `Helius ${res.status}` },
            { status: res.status }
          );
        }
        break;
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      allSwaps.push(...data);
      beforeSig = data[data.length - 1]?.signature;
      if (data.length < 100) break;
    }

    // Parse swaps using tokenTransfers + nativeTransfers + accountData
    // Handles: direct swaps, Padre/Terminal delegated trades, Jupiter, pump.fun
    const transactions: any[] = [];

    for (const tx of allSwaps) {
      const tokenTransfers = tx.tokenTransfers || [];
      const nativeTransfers = tx.nativeTransfers || [];
      const accountData = tx.accountData || [];

      // Find token transfers involving this wallet (non-SOL tokens)
      const tokensReceived = tokenTransfers.filter(
        (t: any) =>
          t.toUserAccount === wallet &&
          t.mint !== SOL_MINT &&
          t.tokenAmount > 0
      );
      const tokensSent = tokenTransfers.filter(
        (t: any) =>
          t.fromUserAccount === wallet &&
          t.mint !== SOL_MINT &&
          t.tokenAmount > 0
      );

      // Get wallet's net SOL change from accountData (most reliable)
      // This includes ALL SOL movements — bonding curve payouts, fees, etc.
      const walletAcctData = accountData.find(
        (a: any) => a.account === wallet
      );
      const walletSolChange = walletAcctData
        ? walletAcctData.nativeBalanceChange / 1e9
        : 0;

      // Also check wrapped SOL token balance changes on wallet
      const walletWsolChange = (walletAcctData?.tokenBalanceChanges || [])
        .filter((tc: any) => tc.mint === SOL_MINT)
        .reduce((s: number, tc: any) => {
          const raw = parseInt(tc.rawTokenAmount?.tokenAmount || "0", 10);
          const dec = tc.rawTokenAmount?.decimals || 9;
          return s + raw / Math.pow(10, dec);
        }, 0);

      const netSolChange = walletSolChange + walletWsolChange;

      let isBuy: boolean;
      let tokenMint = "";
      let tokenAmount = 0;
      let solAmount = 0;

      if (tokensReceived.length > 0 && tokensSent.length === 0) {
        // Received tokens, spent SOL → BUY
        isBuy = true;
        tokenMint = tokensReceived[0].mint;
        tokenAmount = tokensReceived.reduce(
          (s: number, t: any) => s + (t.tokenAmount || 0),
          0
        );
        // Wallet's SOL decreased → amount spent (negative change = spent)
        solAmount = Math.abs(netSolChange);
      } else if (tokensSent.length > 0 && tokensReceived.length === 0) {
        // Sent tokens, received SOL → SELL
        isBuy = false;
        tokenMint = tokensSent[0].mint;
        tokenAmount = tokensSent.reduce(
          (s: number, t: any) => s + (t.tokenAmount || 0),
          0
        );
        // Wallet's SOL increased → amount received (positive change = received)
        solAmount = Math.abs(netSolChange);
      } else if (tokensReceived.length > 0 && tokensSent.length > 0) {
        // Token-to-token swap — treat as BUY of received token
        isBuy = true;
        tokenMint = tokensReceived[0].mint;
        tokenAmount = tokensReceived[0].tokenAmount || 0;
        solAmount = Math.abs(netSolChange);
      } else {
        // No direct token transfers for this wallet —
        // Delegated trade (Padre/Terminal relay wallet)
        // Use accountData to find token + SOL balance changes across ALL accounts
        const allTokenChanges: { mint: string; amount: number; account: string }[] = [];

        for (const acct of accountData) {
          for (const tc of acct.tokenBalanceChanges || []) {
            if (tc.mint === SOL_MINT) continue;
            const decimals = tc.rawTokenAmount?.decimals || 0;
            const raw = parseInt(tc.rawTokenAmount?.tokenAmount || "0", 10);
            const amount = raw / Math.pow(10, decimals);
            if (amount !== 0) {
              allTokenChanges.push({ mint: tc.mint, amount, account: acct.account });
            }
          }
        }

        if (allTokenChanges.length === 0) continue;

        // Find the actual trade SOL amount from the largest SOL movement
        // The bonding curve / pool account has the biggest absolute SOL change
        // (excluding tiny fee accounts)
        const solChanges = accountData
          .filter((a: any) => Math.abs(a.nativeBalanceChange) > 10000) // > 0.00001 SOL
          .map((a: any) => ({
            account: a.account,
            sol: a.nativeBalanceChange / 1e9,
          }));

        // The bonding curve has the largest absolute SOL change (it sends/receives the trade amount)
        const largestSolChange = solChanges.length > 0
          ? solChanges.reduce((a: { account: string; sol: number }, b: { account: string; sol: number }) => Math.abs(a.sol) > Math.abs(b.sol) ? a : b)
          : { account: "", sol: 0 };

        const tradeSolAmount = Math.abs(largestSolChange.sol);

        // Determine direction from token changes
        const positives = allTokenChanges.filter((c) => c.amount > 0);
        const negatives = allTokenChanges.filter((c) => c.amount < 0);

        if (positives.length > 0 && negatives.length > 0) {
          // Tokens moved from one account to another — check if bonding curve lost SOL (= buy)
          if (largestSolChange.sol < 0) {
            // Bonding curve lost SOL → someone bought tokens
            isBuy = true;
            const biggest = positives.reduce((a, b) => (a.amount > b.amount ? a : b));
            tokenMint = biggest.mint;
            tokenAmount = biggest.amount;
          } else {
            // Bonding curve gained SOL → someone sold tokens
            isBuy = false;
            const biggest = negatives.reduce((a, b) => (Math.abs(a.amount) > Math.abs(b.amount) ? a : b));
            tokenMint = biggest.mint;
            tokenAmount = Math.abs(biggest.amount);
          }
          solAmount = tradeSolAmount;
        } else if (positives.length > 0) {
          isBuy = true;
          const biggest = positives.reduce((a, b) => (a.amount > b.amount ? a : b));
          tokenMint = biggest.mint;
          tokenAmount = biggest.amount;
          solAmount = tradeSolAmount;
        } else if (negatives.length > 0) {
          isBuy = false;
          const biggest = negatives.reduce((a, b) => (Math.abs(a.amount) > Math.abs(b.amount) ? a : b));
          tokenMint = biggest.mint;
          tokenAmount = Math.abs(biggest.amount);
          solAmount = tradeSolAmount;
        } else {
          continue;
        }
      }

      if (!tokenMint) continue;

      const timestamp = tx.timestamp
        ? new Date(tx.timestamp * 1000).toISOString()
        : new Date().toISOString();

      transactions.push({
        hash: tx.signature || "",
        timestamp,
        type: isBuy ? "BUY" : "SELL",
        tokenAddress: tokenMint,
        tokenSymbol: "???", // Will be enriched below
        tokenName: "",
        tokenAmount,
        quoteSymbol: "SOL",
        quoteAmount: solAmount,
        usdValue: 0, // Will be enriched below
        exchange: tx.source || "",
        walletAddress: wallet,
      });
    }

    // Enrich: SOL price — try DEXScreener first (no rate limit), CoinGecko as fallback
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
        const priceRes = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          solPrice = priceData.solana?.usd || 0;
        }
      } catch {}
    }

    if (solPrice > 0) {
      for (const tx of transactions) {
        if (tx.quoteAmount > 0) {
          tx.usdValue = tx.quoteAmount * solPrice;
        }
      }
    }

    // Enrich: token symbols via DEXScreener batch
    const unknownMints = [
      ...new Set(transactions.map((t: any) => t.tokenAddress)),
    ];

    if (unknownMints.length > 0) {
      const symbolMap = new Map<string, { symbol: string; name: string }>();
      const BATCH = 30;

      for (let i = 0; i < unknownMints.length; i += BATCH) {
        try {
          const batch = unknownMints.slice(i, i + BATCH);
          const res = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${batch.join(",")}`
          );
          if (res.ok) {
            const data = await res.json();
            for (const pair of data.pairs || []) {
              const addr = pair.baseToken?.address;
              if (addr && !symbolMap.has(addr)) {
                symbolMap.set(addr, {
                  symbol: pair.baseToken.symbol,
                  name: pair.baseToken.name || "",
                });
              }
            }
          }
        } catch {}
      }

      for (const tx of transactions) {
        const info = symbolMap.get(tx.tokenAddress);
        if (info) {
          tx.tokenSymbol = info.symbol;
          tx.tokenName = info.name;
        }
      }
    }

    return NextResponse.json({
      wallet,
      totalTransactions: transactions.length,
      transactions,
      solPrice,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
