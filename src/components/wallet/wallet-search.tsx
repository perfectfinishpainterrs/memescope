// Wallet & Token address search bar
"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Wallet, Hash } from "lucide-react";

type SearchMode = "WALLET" | "TOKEN";

interface Props {
  onScan: (address: string) => void;
  isScanning: boolean;
}

/**
 * Heuristic: Solana addresses are base58 encoded, 32-44 chars.
 * Known token mints (pump.fun etc) often end in "pump" — suggest token view.
 * Wallet addresses look similar but we let the user pick mode.
 */
function looksLikeToken(address: string): boolean {
  const trimmed = address.trim();
  // Ends with "pump" (pump.fun tokens)
  if (/pump$/i.test(trimmed)) return true;
  // Contains common token suffixes
  if (/mint$/i.test(trimmed)) return true;
  return false;
}

export function WalletSearch({ onScan, isScanning }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<SearchMode>("WALLET");

  const autoSuggested = useMemo(
    () => value.trim().length > 30 && looksLikeToken(value),
    [value]
  );

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (mode === "TOKEN") {
      router.push(`/token/${encodeURIComponent(trimmed)}?chain=SOL`);
    } else {
      onScan(trimmed);
    }
  }, [value, mode, onScan, router]);

  return (
    <div className="mb-5 space-y-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-1">
        {(["WALLET", "TOKEN"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${
              mode === m
                ? "bg-neon-green/15 text-neon-green border border-neon-green/30"
                : "text-text-dim hover:text-text-secondary border border-transparent"
            }`}
          >
            {m === "WALLET" ? (
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="w-3 h-3" />
                Scan Wallet
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Hash className="w-3 h-3" />
                View Token
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-bg-panel border border-border rounded-xl focus-within:border-neon-green focus-within:shadow-[0_0_24px_rgba(0,255,136,0.06)] transition-all">
        <Search className="w-4 h-4 text-text-dim flex-shrink-0" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={
            mode === "WALLET"
              ? "Paste wallet address to scan..."
              : "Paste token mint address..."
          }
          className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm font-mono"
        />
        <button
          onClick={handleSubmit}
          disabled={isScanning || !value.trim()}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-neon-green to-emerald-500 text-bg-deep font-bold text-xs font-mono tracking-wide uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,255,136,0.25)] hover:-translate-y-px transition-all"
        >
          {mode === "TOKEN"
            ? "VIEW"
            : isScanning
              ? "SCANNING..."
              : "SCAN"}
        </button>
      </div>

      {/* Auto-detect suggestion */}
      {autoSuggested && mode === "WALLET" && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono text-neon-blue">
          <Hash className="w-3 h-3" />
          <span>This looks like a token address.</span>
          <button
            onClick={() => setMode("TOKEN")}
            className="underline hover:text-neon-green transition-colors"
          >
            Switch to Token view?
          </button>
        </div>
      )}
    </div>
  );
}
