// =============================================
// Solana Blockchain Service
// Handles: wallet scanning, transaction parsing,
// token data, holder info via Moralis API
// =============================================

import { Connection, PublicKey } from "@solana/web3.js";
import { API_URLS } from "@/config";
import {
  getMoralisWalletTokens,
  getMoralisTokenMetadata,
} from "@/lib/blockchain/moralis";
import type { Transaction } from "@/types";

const MORALIS_KEY = process.env.MORALIS_API_KEY || "";
const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

// -- Connection ----------------------------------

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(PUBLIC_RPC, "confirmed");
  }
  return connection;
}

// -- SOL Price -----------------------------------

const SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Fetch current SOL/USD price from CoinGecko.
 */
export async function getSolPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    const data = await res.json();
    return data.solana?.usd || 0;
  } catch {
    return 0;
  }
}

// -- Wallet Scan ---------------------------------

/**
 * Fetch all token holdings for a wallet address.
 * Uses Moralis SOL API for enriched token data.
 */
export async function getWalletTokens(walletAddress: string) {
  return getMoralisWalletTokens(walletAddress);
}

/**
 * Fetch swap history for a wallet from Moralis SOL API.
 * Returns raw Moralis swap objects.
 */
export async function getWalletTransactions(
  walletAddress: string,
  _limit = 100
) {
  return getMoralisSolSwaps(walletAddress);
}

/**
 * Fetch swap history from Moralis Solana gateway.
 */
async function getMoralisSolSwaps(walletAddress: string) {
  if (!MORALIS_KEY) throw new Error("MORALIS_API_KEY not configured");

  const url = `${API_URLS.MORALIS_SOL}/account/mainnet/${walletAddress}/swaps`;
  const res = await fetch(url, {
    headers: {
      "X-API-Key": MORALIS_KEY,
      accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Moralis swaps ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Parse Moralis swap objects into our Transaction type.
 *
 * Moralis swap fields used:
 *   transactionHash, blockTimestamp, baseToken, quoteToken,
 *   bought, sold, baseAmount, quoteAmount, walletAddress
 *
 * Logic:
 *   - If `bought` is truthy the wallet acquired the base token -> BUY
 *   - If `sold` is truthy the wallet sold the base token      -> SELL
 */
export function parseTransactions(
  rawTxns: any[],
  targetToken?: string,
  solPrice: number = 0
): Transaction[] {
  const transactions: Transaction[] = [];

  if (!Array.isArray(rawTxns)) return transactions;

  for (const swap of rawTxns) {
    // Determine direction
    const isBuy = !!swap.bought;

    // The token amount is always in baseAmount; the SOL/quote amount in quoteAmount
    const tokenAmount = Number(swap.baseAmount || 0);
    const quoteAmount = Number(swap.quoteAmount || 0);

    // If a target token is specified, skip swaps that don't involve it
    if (targetToken) {
      const baseAddr =
        typeof swap.baseToken === "string"
          ? swap.baseToken
          : swap.baseToken?.address || swap.baseToken?.mint || "";
      const quoteAddr =
        typeof swap.quoteToken === "string"
          ? swap.quoteToken
          : swap.quoteToken?.address || swap.quoteToken?.mint || "";

      if (baseAddr !== targetToken && quoteAddr !== targetToken) {
        continue;
      }
    }

    // Price per token in quote terms
    const pricePerToken = tokenAmount > 0 ? quoteAmount / tokenAmount : 0;

    // Attempt to derive a USD value.
    // If the quote side is SOL (wrapped or native), multiply by solPrice.
    // Otherwise fall back to quoteAmount as-is (could already be USD on some pairs).
    const quoteIsSol =
      (typeof swap.quoteToken === "string" && swap.quoteToken === SOL_MINT) ||
      (swap.quoteToken?.address === SOL_MINT) ||
      (swap.quoteToken?.mint === SOL_MINT) ||
      (swap.quoteToken?.symbol === "SOL") ||
      (swap.quoteToken?.symbol === "WSOL");

    const totalUsd = quoteIsSol ? quoteAmount * solPrice : quoteAmount;

    // Timestamp: Moralis may return ISO string or epoch seconds
    let timestamp: string;
    if (typeof swap.blockTimestamp === "string") {
      timestamp = new Date(swap.blockTimestamp).toISOString();
    } else if (typeof swap.blockTimestamp === "number") {
      timestamp = new Date(swap.blockTimestamp * 1000).toISOString();
    } else {
      timestamp = new Date().toISOString();
    }

    transactions.push({
      timestamp,
      type: isBuy ? "BUY" : "SELL",
      amount: tokenAmount,
      price: pricePerToken,
      totalUsd,
      txHash: swap.transactionHash || "",
    });
  }

  return transactions;
}

// -- Token Data ----------------------------------

/**
 * Get token metadata via Moralis SOL API.
 */
export async function getTokenMetadata(mintAddress: string) {
  return getMoralisTokenMetadata(mintAddress);
}

// -- Holder Data ---------------------------------

/**
 * Get holder count and top holders for a token.
 * Uses @solana/web3.js getTokenLargestAccounts (public RPC).
 * Wrapped in try/catch to gracefully handle "Too many accounts" errors.
 */
export async function getTokenHolders(mintAddress: string) {
  try {
    const conn = getConnection();
    const mint = new PublicKey(mintAddress);

    const tokenAccounts = await conn.getTokenLargestAccounts(mint);

    // Get total supply for percentage calculations
    const supply = await conn.getTokenSupply(mint);
    const totalSupply = Number(supply.value.amount);

    const holders = tokenAccounts.value.map((account) => ({
      address: account.address.toBase58(),
      amount: Number(account.amount),
      percentage: totalSupply > 0 ? (Number(account.amount) / totalSupply) * 100 : 0,
    }));

    return {
      topHolders: holders,
      totalSupply,
    };
  } catch (err: any) {
    // Gracefully handle "Too many accounts" or any other RPC error
    const msg = err?.message || String(err);
    if (msg.includes("Too many accounts")) {
      console.warn(`[getTokenHolders] Too many accounts for ${mintAddress}, returning empty.`);
    } else {
      console.error(`[getTokenHolders] Error for ${mintAddress}:`, msg);
    }
    return {
      topHolders: [],
      totalSupply: 0,
    };
  }
}

// -- Mint Authority Check ------------------------

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
