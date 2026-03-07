// Token detail panel — full implementation
// Renders: header, position stats, price chart, market stats,
// scam scanner, and transaction history
"use client";

import { useMemo } from "react";
import type { Position, Transaction } from "@/types";
import {
  formatUsd,
  formatPrice,
  formatPct,
  formatPnl,
  formatNumber,
  timeAgo,
  cn,
  getSafetyGrade,
} from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Sub-components ───────────────────────────────────────

interface Props {
  position: Position;
}

/** Tiny label used throughout the panel */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono">
      {children}
    </span>
  );
}

/** Single stat card used in grids */
function StatCard({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-bg-card border border-border rounded-lg p-3 flex flex-col gap-1",
        className
      )}
    >
      <Label>{label}</Label>
      <span className="font-mono text-sm text-white leading-tight">
        {value}
      </span>
      {sub && (
        <span className="font-mono text-[10px] text-text-secondary leading-tight">
          {sub}
        </span>
      )}
    </div>
  );
}

/** Pass / fail row in the safety panel */
function CheckRow({
  label,
  pass,
  value,
}: {
  label: string;
  pass: boolean;
  value?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <span className={pass ? "text-neon-green" : "text-neon-red"}>
          {pass ? "\u2713" : "\u2717"}
        </span>
        <span className="text-text-secondary font-mono text-xs">{label}</span>
      </div>
      {value !== undefined && (
        <span className="text-text-dim font-mono text-[10px]">{value}</span>
      )}
    </div>
  );
}

// ─── Custom Recharts tooltip ──────────────────────────────

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-bg-panel border border-border rounded px-2.5 py-1.5 shadow-lg">
      <p className="text-text-dim font-mono text-[10px]">
        {data.timestamp
          ? new Date(data.timestamp).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"}
      </p>
      <p className="text-neon-green font-mono text-xs">
        ${formatPrice(data.price ?? 0)}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────

export function TokenDetail({ position }: Props) {
  const tokenData = position.tokenData;
  const safetyData = position.safetyData;
  const checks = safetyData?.checks;

  // Derive safety color class helpers
  const safety = getSafetyGrade(safetyData?.score ?? 0);
  const safetyBorderClass =
    safety.grade === "SAFE"
      ? "border-neon-green"
      : safety.grade === "CAUTION"
        ? "border-neon-yellow"
        : "border-neon-red";
  const safetyTextClass =
    safety.grade === "SAFE"
      ? "text-neon-green"
      : safety.grade === "CAUTION"
        ? "text-neon-yellow"
        : "text-neon-red";

  // PNL color
  const pnlPositive = (position.pnl ?? 0) >= 0;
  const pnlClass = pnlPositive ? "text-neon-green" : "text-neon-red";

  // 24h change color
  const changePositive = (tokenData?.priceChange24h ?? 0) >= 0;
  const changeClass = changePositive ? "text-neon-green" : "text-neon-red";

  // Merged + sorted transactions (most recent first, limit 10)
  const recentTxns = useMemo(() => {
    const all: Transaction[] = [
      ...(position.buys ?? []),
      ...(position.sells ?? []),
    ];
    all.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return all.slice(0, 10);
  }, [position.buys, position.sells]);

  // Price history data
  const priceHistory = tokenData?.priceHistory ?? [];

  return (
    <div className="animate-fade-in space-y-4">
      {/* ──────────────── 1. TOKEN HEADER ──────────────── */}
      <div className="flex items-center justify-between bg-bg-panel border border-border rounded-xl p-4">
        {/* Left: name + price */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white font-sans">
              {position.name ?? "Unknown"}
            </span>
            <span className="text-text-dim font-mono text-sm">
              ${position.ticker ?? "???"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-mono text-white">
              ${formatPrice(tokenData?.price ?? position.currentPrice ?? 0)}
            </span>
            <span className={cn("font-mono text-sm", changeClass)}>
              {formatPct(tokenData?.priceChange24h ?? 0)}
            </span>
          </div>
        </div>

        {/* Right: safety badge */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center",
              safetyBorderClass
            )}
          >
            <span className={cn("font-mono text-base font-bold", safetyTextClass)}>
              {safetyData?.score ?? "—"}
            </span>
          </div>
          <span
            className={cn(
              "text-[10px] uppercase tracking-widest font-mono font-semibold",
              safetyTextClass
            )}
          >
            {safetyData?.grade ?? safety.grade}
          </span>
        </div>
      </div>

      {/* ──────────────── 2. POSITION STATS ──────────────── */}
      <div className="grid grid-cols-6 gap-2">
        <StatCard label="Invested" value={formatUsd(position.invested ?? 0)} />
        <StatCard label="Value" value={formatUsd(position.currentValue ?? 0)} />
        <StatCard
          label="PNL"
          value={
            <span className={pnlClass}>
              {formatPnl(position.pnl ?? 0)}
            </span>
          }
          sub={
            <span className={pnlClass}>
              {formatPct(position.pnlPct ?? 0)}
            </span>
          }
        />
        <StatCard
          label="Holdings"
          value={formatNumber(position.holdings ?? 0)}
        />
        <StatCard
          label="Avg Entry"
          value={`$${formatPrice(position.avgEntry ?? 0)}`}
        />
        <StatCard
          label="Current"
          value={`$${formatPrice(position.currentPrice ?? 0)}`}
        />
      </div>

      {/* ──────────────── 3. PRICE CHART ──────────────── */}
      <div className="bg-bg-panel border border-border rounded-xl p-4">
        <Label>Price Action</Label>
        <div className="mt-2">
          {priceHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart
                data={priceHistory}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ff88" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                  tick={{ fill: "#4a5f8a", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) => `$${formatPrice(v)}`}
                  tick={{ fill: "#4a5f8a", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#00ff88"
                  strokeWidth={1.5}
                  fill="url(#priceGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#00ff88" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-text-dim font-mono text-sm">
              Price history unavailable
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── 4. MARKET STATS ──────────────── */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard
          label="Volume 24h"
          value={formatUsd(tokenData?.volume24h ?? 0)}
        />
        <StatCard
          label="Txns 24h"
          value={formatNumber(tokenData?.txns24h ?? 0)}
        />
        <StatCard
          label="Liquidity"
          value={formatUsd(tokenData?.liquidity ?? 0)}
        />
        <StatCard
          label="Market Cap"
          value={formatUsd(tokenData?.marketCap ?? 0)}
        />
      </div>

      {/* ──────────────── 5. SAFETY SCANNER ──────────────── */}
      <div className="bg-bg-panel border border-border rounded-xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-widest text-text-dim font-semibold">
              Scam Scanner
            </span>
            <span
              className={cn(
                "text-xs font-mono font-bold px-2 py-0.5 rounded border",
                safetyTextClass,
                safetyBorderClass
              )}
            >
              {safetyData?.score ?? 0} / 100 &mdash; {safetyData?.grade ?? safety.grade}
            </span>
          </div>
        </div>

        {/* Positives / Flags columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Positives */}
          <div className="space-y-1">
            <Label>Positives</Label>
            {(safetyData?.positives ?? []).length > 0 ? (
              (safetyData.positives).map((msg, i) => (
                <div key={i} className="flex items-start gap-1.5 py-0.5">
                  <span className="text-neon-green text-xs mt-px">{"\u2713"}</span>
                  <span className="text-text-secondary font-mono text-[11px] leading-snug">
                    {msg}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-text-dim font-mono text-[11px]">None</span>
            )}
          </div>

          {/* Flags */}
          <div className="space-y-1">
            <Label>Flags</Label>
            {(safetyData?.flags ?? []).length > 0 ? (
              (safetyData.flags).map((msg, i) => (
                <div key={i} className="flex items-start gap-1.5 py-0.5">
                  <span className="text-neon-red text-xs mt-px">{"\u2717"}</span>
                  <span className="text-text-secondary font-mono text-[11px] leading-snug">
                    {msg}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-text-dim font-mono text-[11px]">None</span>
            )}
          </div>
        </div>

        {/* Individual check rows */}
        {checks && (
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <Label>Detailed Checks</Label>
            <div className="mt-2">
              <CheckRow
                label="LP Locked"
                pass={checks.lpLocked ?? false}
                value={
                  checks.lpLocked
                    ? `${checks.lpLockedPct ?? "?"} for ${checks.lpLockDuration ?? "?"}`
                    : "Not locked"
                }
              />
              <CheckRow
                label="Honeypot"
                pass={!checks.honeypot}
                value={checks.honeypot ? "Detected" : "Clean"}
              />
              <CheckRow
                label="Mint Authority"
                pass={!checks.mintAuthority}
                value={checks.mintAuthority ? "Enabled" : "Disabled"}
              />
              <CheckRow
                label="Freeze Authority"
                pass={!checks.freezeAuthority}
                value={checks.freezeAuthority ? "Enabled" : "Disabled"}
              />
              <CheckRow
                label="Contract Renounced"
                pass={checks.contractRenounced ?? false}
                value={checks.contractRenounced ? "Yes" : "No"}
              />
              <CheckRow
                label="Buy Tax"
                pass={parseFloat(checks.buyTax ?? "0") <= 5}
                value={checks.buyTax ?? "0%"}
              />
              <CheckRow
                label="Sell Tax"
                pass={parseFloat(checks.sellTax ?? "0") <= 5}
                value={checks.sellTax ?? "0%"}
              />
            </div>
          </div>
        )}
      </div>

      {/* ──────────────── 6. TRANSACTION HISTORY ──────────────── */}
      <div className="bg-bg-panel border border-border rounded-xl p-4 space-y-2">
        <Label>Transaction History</Label>

        {recentTxns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-text-dim text-[9px] uppercase tracking-widest border-b border-border">
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-right py-2 pr-3">Amount</th>
                  <th className="text-right py-2 pr-3">Price</th>
                  <th className="text-right py-2 pr-3">USD</th>
                  <th className="text-right py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((tx, i) => {
                  const isBuy = tx.type === "BUY";
                  return (
                    <tr
                      key={tx.txHash ?? i}
                      className="border-b border-border/40 last:border-0 hover:bg-bg-card/50 transition-colors"
                    >
                      <td className="py-1.5 pr-3">
                        <span
                          className={cn(
                            "font-semibold",
                            isBuy ? "text-neon-green" : "text-neon-red"
                          )}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="text-right py-1.5 pr-3 text-text-secondary">
                        {formatNumber(tx.amount ?? 0)}
                      </td>
                      <td className="text-right py-1.5 pr-3 text-text-secondary">
                        ${formatPrice(tx.price ?? 0)}
                      </td>
                      <td className="text-right py-1.5 pr-3 text-white">
                        {formatUsd(tx.totalUsd ?? 0)}
                      </td>
                      <td className="text-right py-1.5 text-text-dim">
                        {tx.timestamp ? timeAgo(tx.timestamp) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-text-dim font-mono text-sm py-6">
            No transactions recorded
          </div>
        )}
      </div>
    </div>
  );
}
