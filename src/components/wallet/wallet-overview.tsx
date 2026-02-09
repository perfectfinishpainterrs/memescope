// Wallet overview stats bar
"use client";

import type { WalletData } from "@/types";
import { formatUsd, formatPct } from "@/lib/utils";

interface Props {
  wallet: WalletData;
}

export function WalletOverview({ wallet }: Props) {
  // TODO: Implement full stats bar matching the mockup
  // Shows: Total Value, Total PNL, Positions, Transactions, Win Rate
  return (
    <div className="grid grid-cols-5 gap-2.5 mb-5">
      {/* Placeholder — connect to real data */}
      <div className="p-3.5 bg-bg-panel border border-border rounded-lg">
        <div className="text-[9px] text-text-dim uppercase tracking-widest font-mono mb-1">
          Total Value
        </div>
        <div className="text-xl font-extrabold font-mono text-text-primary">
          {formatUsd(wallet.totalValue)}
        </div>
      </div>
      <div className="p-3.5 bg-bg-panel border border-border rounded-lg">
        <div className="text-[9px] text-text-dim uppercase tracking-widest font-mono mb-1">
          Total PNL
        </div>
        <div className="text-xl font-extrabold font-mono text-neon-green">
          {formatUsd(wallet.totalPnl)} ({formatPct(wallet.totalPnlPct)})
        </div>
      </div>
      {/* Add remaining stat cards */}
    </div>
  );
}
