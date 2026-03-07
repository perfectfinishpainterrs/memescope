// ═══════════════════════════════════════════
// Caching Layer
// In-memory LRU + Supabase-backed persistence
// ═══════════════════════════════════════════

import { supabaseAdmin } from "@/lib/db/supabase";

// ── In-memory LRU Cache ─────────────────

class LRUCache {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recent)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data as T;
  }

  set(key: string, data: unknown, ttlMs: number) {
    if (this.cache.size >= this.maxSize) {
      // Delete oldest (first key)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

export const memoryCache = new LRUCache(500);

// ── TTL Constants ───────────────────────

export const CACHE_TTL = {
  PRICE: 30_000, // 30 seconds
  METADATA: 300_000, // 5 minutes
  SCAN: 300_000, // 5 minutes
  SAFETY: 900_000, // 15 minutes
  HOLDERS: 3_600_000, // 1 hour
};

// ── Supabase-backed Cache ───────────────

export async function getCachedScan(address: string, chain: string) {
  const { data } = await supabaseAdmin
    .from("scan_cache")
    .select("result, expires_at")
    .eq("address", address)
    .eq("chain", chain)
    .single();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data.result;
}

export async function setCachedScan(
  address: string,
  chain: string,
  result: unknown,
  ttlSeconds = 300
) {
  const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabaseAdmin
    .from("scan_cache")
    .upsert(
      { address, chain, result, expires_at },
      { onConflict: "address,chain" }
    );
}

export async function getCachedSafety(tokenAddress: string) {
  const { data } = await supabaseAdmin
    .from("safety_cache")
    .select("result, score, expires_at")
    .eq("token_address", tokenAddress)
    .single();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data.result;
}

export async function setCachedSafety(
  tokenAddress: string,
  result: unknown,
  score: number,
  ttlSeconds = 900
) {
  const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabaseAdmin
    .from("safety_cache")
    .upsert(
      { token_address: tokenAddress, result, score, expires_at },
      { onConflict: "token_address" }
    );
}
