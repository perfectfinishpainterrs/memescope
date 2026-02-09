import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind class merge ────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Number formatters ───────────────────

export function formatUsd(n: number): string {
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

export function formatPrice(n: number): string {
  if (n < 0.000001) return n.toFixed(9);
  if (n < 0.001) return n.toFixed(6);
  if (n < 1) return n.toFixed(4);
  return n.toFixed(2);
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return sign + n.toFixed(1) + "%";
}

export function formatPnl(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return sign + formatUsd(n);
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

export function detectChain(addr: string): "SOL" | "EVM" | null {
  if (isValidSolanaAddress(addr)) return "SOL";
  if (isValidEvmAddress(addr)) return "EVM";
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
