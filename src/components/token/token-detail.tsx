// Token detail panel — TODO: implement all charts from mockup
// This component renders everything below the position tabs:
// - Token header + holder count + safety score
// - Position stat cards
// - Price action chart + Holder trend chart
// - Holder distribution pie + Inflow/Outflow + Holder stats
// - Scam scanner panel
// - Buy/sell volume chart + Entry ladder
"use client";
import type { Position } from "@/types";

interface Props {
  position: Position;
}

export function TokenDetail({ position }: Props) {
  return (
    <div className="animate-fade-in">
      {/* TODO: Port the full UI from wallet-scanner-v3.jsx mockup */}
      <div className="p-6 bg-bg-panel border border-border rounded-xl text-center text-text-dim font-mono">
        Token detail for {position.name} — connect charts and data here.
        <br />
        See /docs/IMPLEMENTATION.md for the component breakdown.
      </div>
    </div>
  );
}
