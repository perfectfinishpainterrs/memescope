// ═══════════════════════════════════════════
// useWalletScan Hook
// Manages wallet scanning state and data flow
// ═══════════════════════════════════════════

"use client";

import { useState, useCallback } from "react";
import type { WalletData, Position } from "@/types";
import { detectChain } from "@/lib/utils";

// TODO: Replace with real API calls in Phase 2
// For now, returns mock data to validate the UI

export function useWalletScan() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanWallet = useCallback(async (address: string) => {
    setError(null);
    setIsScanning(true);

    try {
      // Detect chain
      const chain = detectChain(address);
      if (!chain) {
        throw new Error("Invalid wallet address");
      }

      // Call our API route
      const res = await fetch("/api/wallet/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chain }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Scan failed");
      }

      const data = await res.json();
      setWalletData(data.wallet);
      setPositions(data.positions);
      setSelectedPosition(0);
    } catch (err: any) {
      setError(err.message);
      console.error("Wallet scan error:", err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  return {
    walletData,
    positions,
    selectedPosition,
    setSelectedPosition,
    isScanning,
    error,
    scanWallet,
  };
}
