// Header component — top nav bar
"use client";

import { APP_CONFIG } from "@/config";

export function Header() {
  return (
    <header className="flex items-center justify-between px-7 py-3.5 border-b border-border bg-bg-panel/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center text-sm font-black text-bg-deep font-mono shadow-[0_0_24px_rgba(0,255,136,0.2)]">
          ◎
        </div>
        <div>
          <div className="font-mono font-bold text-lg bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent">
            {APP_CONFIG.name}
          </div>
          <div className="text-[10px] text-text-dim font-mono tracking-widest uppercase">
            {APP_CONFIG.tagline}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-neon-green uppercase tracking-widest">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_8px_#00ff88] animate-pulse-dot" />
        LIVE
      </div>
    </header>
  );
}
