// ═══════════════════════════════════════════
// Token Memory — persistent storage for all searched tokens
// Stores: price, holders, safety, sentiment, research
// Uses local JSON file in dev, Supabase in prod
// ═══════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface TokenMemoryEntry {
  address: string;
  chain: string;
  name: string | null;
  ticker: string | null;
  // Price
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  // Holders
  totalHolders: number;
  topHolderPct: number;
  concentration: number;
  whaleAction: string;
  holderChange24h: number;
  uniqueBuyers24h: number;
  uniqueSellers24h: number;
  // Safety
  safetyScore: number;
  safetyGrade: string;
  safetyFlags: string[];
  safetyPositives: string[];
  // Sentiment
  sentimentBullish: number;
  sentimentBearish: number;
  sentimentNeutral: number;
  sentimentOverall: number;
  totalTweets: number;
  topTweets: any[];
  // Research
  research: any | null;
  // Meta
  firstSeen: string;
  lastSearched: string;
  searchCount: number;
}

const DATA_DIR = join(process.cwd(), "data");
const MEMORY_FILE = join(DATA_DIR, "token-memory.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readMemory(): Record<string, TokenMemoryEntry> {
  ensureDataDir();
  if (!existsSync(MEMORY_FILE)) return {};
  try {
    return JSON.parse(readFileSync(MEMORY_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeMemory(data: Record<string, TokenMemoryEntry>) {
  ensureDataDir();
  writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

/**
 * Save or update a token in memory. Merges with existing data.
 */
export function saveTokenMemory(entry: Partial<TokenMemoryEntry> & { address: string; chain: string }) {
  const memory = readMemory();
  const key = `${entry.chain}:${entry.address}`;
  const existing = memory[key];
  const now = new Date().toISOString();

  memory[key] = {
    address: entry.address,
    chain: entry.chain,
    name: entry.name ?? existing?.name ?? null,
    ticker: entry.ticker ?? existing?.ticker ?? null,
    price: entry.price ?? existing?.price ?? 0,
    priceChange24h: entry.priceChange24h ?? existing?.priceChange24h ?? 0,
    volume24h: entry.volume24h ?? existing?.volume24h ?? 0,
    liquidity: entry.liquidity ?? existing?.liquidity ?? 0,
    marketCap: entry.marketCap ?? existing?.marketCap ?? 0,
    totalHolders: entry.totalHolders ?? existing?.totalHolders ?? 0,
    topHolderPct: entry.topHolderPct ?? existing?.topHolderPct ?? 0,
    concentration: entry.concentration ?? existing?.concentration ?? 0,
    whaleAction: entry.whaleAction ?? existing?.whaleAction ?? "unknown",
    holderChange24h: entry.holderChange24h ?? existing?.holderChange24h ?? 0,
    uniqueBuyers24h: entry.uniqueBuyers24h ?? existing?.uniqueBuyers24h ?? 0,
    uniqueSellers24h: entry.uniqueSellers24h ?? existing?.uniqueSellers24h ?? 0,
    safetyScore: entry.safetyScore ?? existing?.safetyScore ?? 0,
    safetyGrade: entry.safetyGrade ?? existing?.safetyGrade ?? "UNKNOWN",
    safetyFlags: entry.safetyFlags ?? existing?.safetyFlags ?? [],
    safetyPositives: entry.safetyPositives ?? existing?.safetyPositives ?? [],
    sentimentBullish: entry.sentimentBullish ?? existing?.sentimentBullish ?? 0,
    sentimentBearish: entry.sentimentBearish ?? existing?.sentimentBearish ?? 0,
    sentimentNeutral: entry.sentimentNeutral ?? existing?.sentimentNeutral ?? 0,
    sentimentOverall: entry.sentimentOverall ?? existing?.sentimentOverall ?? 0,
    totalTweets: entry.totalTweets ?? existing?.totalTweets ?? 0,
    topTweets: entry.topTweets ?? existing?.topTweets ?? [],
    research: entry.research ?? existing?.research ?? null,
    firstSeen: existing?.firstSeen ?? now,
    lastSearched: now,
    searchCount: (existing?.searchCount ?? 0) + 1,
  };

  writeMemory(memory);
  return memory[key];
}

/**
 * Get a single token from memory.
 */
export function getTokenMemory(address: string, chain: string): TokenMemoryEntry | null {
  const memory = readMemory();
  return memory[`${chain}:${address}`] || null;
}

/**
 * Get all tokens from memory, sorted by last searched.
 */
export function getAllTokenMemory(): TokenMemoryEntry[] {
  const memory = readMemory();
  return Object.values(memory).sort(
    (a, b) => new Date(b.lastSearched).getTime() - new Date(a.lastSearched).getTime()
  );
}

/**
 * Get memory stats.
 */
export function getMemoryStats() {
  const all = getAllTokenMemory();
  return {
    totalTokens: all.length,
    totalSearches: all.reduce((sum, t) => sum + t.searchCount, 0),
    lastSearch: all[0]?.lastSearched ?? null,
    avgSafetyScore: all.length > 0
      ? Math.round(all.reduce((sum, t) => sum + t.safetyScore, 0) / all.length)
      : 0,
  };
}
