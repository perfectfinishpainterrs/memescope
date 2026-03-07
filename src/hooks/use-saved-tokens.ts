// ═══════════════════════════════════════════
// useSavedTokens — Dashboard hook
// Fetches watchlist + enriches with live
// token data. Auto-refreshes every 30s.
// ═══════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from "react";
import type { Chain } from "@/types";

export interface SavedTokenLive {
  // Watchlist fields
  id: string;
  user_id: string;
  token_address: string;
  chain: Chain;
  label: string | null;
  created_at: string;
  // Enriched live data
  live: {
    price: number;
    priceChange24h: number;
    volume24h: number;
    txns24h: number;
    liquidity: number;
    marketCap: number;
    name: string;
    ticker: string;
  };
}

interface UseSavedTokensReturn {
  tokens: SavedTokenLive[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  removeToken: (id: string) => void;
}

export function useSavedTokens(): UseSavedTokensReturn {
  const [tokens, setTokens] = useState<SavedTokenLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/user/saved-tokens");
      if (!res.ok) {
        if (res.status === 401) {
          setTokens([]);
          setError(null);
          return;
        }
        throw new Error(`Failed to fetch (${res.status})`);
      }
      const data: SavedTokenLive[] = await res.json();
      setTokens(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  const removeToken = useCallback((id: string) => {
    setTokens((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initial fetch + auto-refresh every 30s
  useEffect(() => {
    fetchTokens();

    intervalRef.current = setInterval(fetchTokens, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTokens]);

  return { tokens, loading, error, refetch: fetchTokens, removeToken };
}
