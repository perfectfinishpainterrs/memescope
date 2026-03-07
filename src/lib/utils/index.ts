import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind class merge ────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Number formatters ───────────────────

export function formatUsd(n: number | undefined | null): string {
  const v = n ?? 0;
  if (Math.abs(v) >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  if (Math.abs(v) >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
  return "$" + v.toFixed(2);
}

export function formatNumber(n: number | undefined | null): string {
  const v = n ?? 0;
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return v.toLocaleString();
}

export function formatPrice(n: number | undefined | null): string {
  const v = n ?? 0;
  if (v < 0.000001) return v.toFixed(9);
  if (v < 0.001) return v.toFixed(6);
  if (v < 1) return v.toFixed(4);
  return v.toFixed(2);
}

export function formatPct(n: number | undefined | null): string {
  const v = n ?? 0;
  const sign = v >= 0 ? "+" : "";
  return sign + v.toFixed(1) + "%";
}

export function formatPnl(n: number | undefined | null): string {
  const v = n ?? 0;
  const sign = v >= 0 ? "+" : "";
  return sign + formatUsd(v);
}

// ── Address formatters ──────────────────

export function shortenAddress(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export function isValidSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

export function isValidEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export function detectChain(addr: string): "SOL" | "ETH" | null {
  if (isValidSolanaAddress(addr)) return "SOL";
  if (isValidEvmAddress(addr)) return "ETH";
  return null;
}

// ── Time helpers ────────────────────────

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ── Safety helpers ──────────────────────

export function getSafetyGrade(score: number): {
  grade: "SAFE" | "CAUTION" | "DANGER";
  color: string;
} {
  if (score >= 70) return { grade: "SAFE", color: "#00ff88" };
  if (score >= 40) return { grade: "CAUTION", color: "#ffd000" };
  return { grade: "DANGER", color: "#ff3366" };
}
