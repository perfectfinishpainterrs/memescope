// Wallet overview stats bar
"use client";

import type { WalletData } from "@/types";
import { formatUsd, formatPct, formatNumber, cn, shortenAddress } from "@/lib/utils";

interface Props {
  wallet: WalletData;
}

export function WalletOverview({ wallet }: Props) {
  const pnlPositive = wallet.totalPnl >= 0;
  const winRateHigh = wallet.winRate >= 0.5;

  return (
    <div className="space-y-3">
      {/* Wallet address + chain badge */}
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-mono text-text-primary tracking-wide">
          {shortenAddress(wallet.address)}
        </span>
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest",
            "bg-neon-blue/10 text-neon-blue border border-neon-blue/20"
          )}
        >
          {wallet.chain}
        </span>
      </div>

      {/* 5-card stats grid */}
      <div className="grid grid-cols-5 gap-2.5">
        {/* 1 — Total Value */}
        <div className="p-3.5 bg-bg-panel border border-border rounded-lg">
          <div className="text-[9px] text-text-dim uppercase tracking-widest font-mono mb-1">
            Total Value
          </div>
          <div className="text-xl font-extrabold font-mono text-text-primary">
            {formatUsd(wallet.totalValue)}
          </div>
        </div>

        {/* 2 — Total PNL */}
        <div className="p-3.5 bg-bg-panel border border-border rounded-lg">
          <div className="text-[9px] text-text-dim uppercase tracking-widest font-mono mb-1">
            Total PNL
          </div>
          <div
            className={cn(
              "text-xl font-extrabold font-mono",
              pnlPositive ? "text-neon-green" : "text-neon-red"
            )}
          >
            {formatUsd(wallet.totalPnl)}{" "}
            <span className="text-sm font-bold">
              ({formatPct(wallet.totalPnlPct)})
            </span>
          </div>
        </div>

        {/* 3 — Positions */}
        <div className="p-3.5 bg-bg-panel border border-border rounded-lg">
          <div className="text-[9px] text-text-dim uppercase tracking-widest font-mono mb-1">
            Positions
          </div>
          <div className="text-xl font-extrabold font-mono text-neon-blue">
            {formatNumber(wallet.positionCount)}
          </div>
        </div>

        {/* 4 — Transactions */}
        <div className="p-3.5 bg-bg-panel border border-border rounded-lg">
          <div className="text-[9px] text-text-dim uppercase tracking-widest font-mono mb-1">
            Transactions
          </div>
          <div className="text-xl font-extrabold font-mono text-neon-blue">
            {formatNumber(wallet.txCount)}
          </div>
        </div>

        {/* 5 — Win Rate */}
        <div className="p-3.5 bg-bg-panel border border-border rounded-lg">
          <div className="text-[9px] text-text-dim uppercase tracking-widest font-mono mb-1">
            Win Rate
          </div>
          <div
            className={cn(
              "text-xl font-extrabold font-mono",
              winRateHigh ? "text-neon-green" : "text-neon-red"
            )}
          >
            {(wallet.winRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
