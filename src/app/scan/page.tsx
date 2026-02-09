"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { WalletSearch } from "@/components/wallet/wallet-search";
import { WalletOverview } from "@/components/wallet/wallet-overview";
import { PositionTabs } from "@/components/wallet/position-tabs";
import { TokenDetail } from "@/components/token/token-detail";
import { useWalletScan } from "@/hooks/use-wallet-scan";

export default function ScanPage() {
  const {
    walletData,
    positions,
    selectedPosition,
    setSelectedPosition,
    isScanning,
    scanWallet,
  } = useWalletScan();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1440px] mx-auto px-7 py-5">
        <WalletSearch onScan={scanWallet} isScanning={isScanning} />

        {walletData && (
          <div className="animate-fade-in">
            <WalletOverview wallet={walletData} />

            <PositionTabs
              positions={positions}
              selected={selectedPosition}
              onSelect={setSelectedPosition}
            />

            {positions[selectedPosition] && (
              <TokenDetail
                key={selectedPosition}
                position={positions[selectedPosition]}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
