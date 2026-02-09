// Wallet address search bar
"use client";

import { useState } from "react";

interface Props {
  onScan: (address: string) => void;
  isScanning: boolean;
}

export function WalletSearch({ onScan, isScanning }: Props) {
  const [value, setValue] = useState("");

  const handleScan = () => {
    if (value.trim()) onScan(value.trim());
  };

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-bg-panel border border-border rounded-xl focus-within:border-neon-green focus-within:shadow-[0_0_24px_rgba(0,255,136,0.06)] transition-all">
        <span className="text-text-dim text-sm">🔍</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
          placeholder="Paste wallet address to scan..."
          className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm font-mono"
        />
        <button
          onClick={handleScan}
          disabled={isScanning || !value.trim()}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-neon-green to-emerald-500 text-bg-deep font-bold text-xs font-mono tracking-wide uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,255,136,0.25)] hover:-translate-y-px transition-all"
        >
          {isScanning ? "SCANNING..." : "SCAN"}
        </button>
      </div>
    </div>
  );
}
