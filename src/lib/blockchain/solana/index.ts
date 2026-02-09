// ═══════════════════════════════════════════
// Solana Blockchain Service
// Handles: wallet scanning, transaction parsing,
// token data, holder info via Helius API
// ═══════════════════════════════════════════

import { Connection, PublicKey } from "@solana/web3.js";
import type { Position, Transaction, TokenData, HolderData } from "@/types";

const HELIUS_KEY = process.env.HELIUS_API_KEY || "";
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
const HELIUS_API = `https://api.helius.xyz/v0`;

// ── Connection ──────────────────────────

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(HELIUS_RPC, "confirmed");
  }
  return connection;
}

// ── Wallet Scan ─────────────────────────

/**
 * Fetch all token holdings for a wallet address.
 * Uses Helius DAS API for enriched token data.
 */
export async function getWalletTokens(walletAddress: string) {
  const response = await fetch(`${HELIUS_RPC}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "memescope",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: walletAddress,
        page: 1,
        limit: 100,
        displayOptions: {
          showFungible: true,
          showNativeBalance: true,
        },
      },
    }),
  });

  const data = await response.json();
  return data.result?.items || [];
}

/**
 * Fetch parsed transaction history for a wallet.
 * Helius enhanced transactions give us human-readable swap data.
 */
export async function getWalletTransactions(
  walletAddress: string,
  limit = 100
) {
  const response = await fetch(
    `${HELIUS_API}/addresses/${walletAddress}/transactions?api-key=${HELIUS_KEY}&limit=${limit}&type=SWAP`,
    { method: "GET" }
  );

  const data = await response.json();
  return data || [];
}

/**
 * Parse raw Helius transactions into our Transaction type.
 * Extracts: token, amount, price, direction (buy/sell), timestamp.
 */
export function parseTransactions(
  rawTxns: any[],
  targetToken?: string
): Transaction[] {
  const transactions: Transaction[] = [];

  for (const tx of rawTxns) {
    if (tx.type !== "SWAP") continue;

    const swapEvent = tx.events?.swap;
    if (!swapEvent) continue;

    // Determine if this is a buy or sell of the target token
    const tokenIn = swapEvent.tokenInputs?.[0];
    const tokenOut = swapEvent.tokenOutputs?.[0];

    if (!tokenIn || !tokenOut) continue;

    // If target token is in outputs → it's a BUY
    // If target token is in inputs → it's a SELL
    const isBuy = targetToken
      ? tokenOut.mint === targetToken
      : tokenIn.mint === "So11111111111111111111111111111111111111112"; // SOL

    const tokenAmount = isBuy
      ? tokenOut.rawTokenAmount?.tokenAmount || 0
      : tokenIn.rawTokenAmount?.tokenAmount || 0;

    const solAmount = isBuy
      ? tokenIn.rawTokenAmount?.tokenAmount || 0
      : tokenOut.rawTokenAmount?.tokenAmount || 0;

    transactions.push({
      timestamp: new Date(tx.timestamp * 1000).toISOString(),
      type: isBuy ? "BUY" : "SELL",
      amount: tokenAmount,
      price: solAmount / tokenAmount, // price in SOL per token
      totalUsd: 0, // will be enriched with price data later
      txHash: tx.signature,
    });
  }

  return transactions;
}

// ── Token Data ──────────────────────────

/**
 * Get token metadata via Helius DAS API.
 */
export async function getTokenMetadata(mintAddress: string) {
  const response = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "memescope",
      method: "getAsset",
      params: { id: mintAddress },
    }),
  });

  const data = await response.json();
  return data.result;
}

// ── Holder Data ─────────────────────────

/**
 * Get holder count and top holders for a token.
 * Uses Helius DAS API getAssetsByGroup or token accounts.
 */
export async function getTokenHolders(mintAddress: string) {
  // Method 1: Get token accounts (all holders)
  const conn = getConnection();
  const mint = new PublicKey(mintAddress);

  const tokenAccounts = await conn.getTokenLargestAccounts(mint);

  // Get total supply for percentage calculations
  const supply = await conn.getTokenSupply(mint);
  const totalSupply = Number(supply.value.amount);

  const holders = tokenAccounts.value.map((account) => ({
    address: account.address.toBase58(),
    amount: Number(account.amount),
    percentage: (Number(account.amount) / totalSupply) * 100,
  }));

  return {
    topHolders: holders,
    totalSupply,
  };
}

// ── Mint Authority Check ────────────────

/**
 * Check if a token still has active mint/freeze authority.
 * Critical for scam detection.
 */
export async function getMintInfo(mintAddress: string) {
  const conn = getConnection();
  const mint = new PublicKey(mintAddress);
  const accountInfo = await conn.getParsedAccountInfo(mint);

  if (!accountInfo.value) return null;

  const parsed = (accountInfo.value.data as any)?.parsed?.info;
  if (!parsed) return null;

  return {
    mintAuthority: parsed.mintAuthority || null,
    freezeAuthority: parsed.freezeAuthority || null,
    supply: parsed.supply,
    decimals: parsed.decimals,
    isInitialized: parsed.isInitialized,
  };
}
