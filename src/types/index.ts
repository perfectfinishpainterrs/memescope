// ═══════════════════════════════════════════
// MEMESCOPE — Shared TypeScript Types
// ═══════════════════════════════════════════

export type Chain = "SOL" | "ETH" | "BASE" | "BSC";

// ── Wallet ──────────────────────────────

export interface WalletData {
  address: string;
  chain: Chain;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  positionCount: number;
  txCount: number;
  winRate: number;
  firstSeen: string;
}

// ── Position ────────────────────────────

export interface Position {
  tokenAddress: string;
  name: string;
  ticker: string;
  chain: Chain;
  holdings: number;
  avgEntry: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  invested: number;
  currentValue: number;
  buys: Transaction[];
  sells: Transaction[];
  tokenData: TokenData;
  holderData: HolderData;
  safetyData: SafetyData;
}

export interface Transaction {
  timestamp: string;
  type: "BUY" | "SELL";
  amount: number;
  price: number;
  totalUsd: number;
  txHash: string;
}

// ── Token Data ──────────────────────────

export interface TokenData {
  address: string;
  name: string;
  ticker: string;
  chain: Chain;
  price: number;
  priceChange24h: number;
  volume24h: number;
  txns24h: number;
  liquidity: number;
  marketCap: number;
  priceHistory: PricePoint[];
  volumeHistory: VolumePoint[];
}

export interface PricePoint {
  timestamp: string;
  price: number;
  isEntry?: boolean;
}

export interface VolumePoint {
  timestamp: string;
  buyVolume: number;
  sellVolume: number;
}

// ── Holder Data ─────────────────────────

export interface HolderData {
  totalHolders: number;
  holderChange24h: number;
  holderChange7d: number;
  topHolderPct: number;
  growthRate: string;
  uniqueBuyers24h: number;
  uniqueSellers24h: number;
  concentration: number;
  whaleAction: "accumulating" | "holding" | "dumping";
  distribution: HolderBucket[];
  holderHistory: HolderPoint[];
  holderFlow: HolderFlowPoint[];
}

export interface HolderBucket {
  range: string;
  count: number;
  percentage: number;
}

export interface HolderPoint {
  timestamp: string;
  count: number;
}

export interface HolderFlowPoint {
  timestamp: string;
  inflow: number;
  outflow: number;
}

// ── Safety / Scam Scanner ───────────────

export interface SafetyData {
  score: number;
  grade: "SAFE" | "CAUTION" | "DANGER";
  checks: SafetyChecks;
  flags: string[];
  positives: string[];
  deployerHistory: string;
}

export interface SafetyChecks {
  // Liquidity
  lpLocked: boolean;
  lpLockDuration: string;
  lpLockedPct: string;

  // Contract
  contractRenounced: boolean;
  honeypot: boolean;
  proxyContract: boolean;

  // Authorities
  mintAuthority: boolean;
  freezeAuthority: boolean;
  blacklistFunction: boolean;

  // Tax
  buyTax: string;
  sellTax: string;

  // Dev
  devWalletPct: string;
  devSelling: boolean;

  // History
  linkedRugs: number;
}

// ── Twitter / X ─────────────────────────

export interface Tweet {
  id: string;
  text: string;
  username: string;
  displayName: string;
  followers: number;
  verified: boolean;
  likes: number;
  impressions: number;
  timestamp: string;
  sentiment: "bullish" | "bearish" | "neutral";
  linkedUrls: string[];
}

export interface KOL {
  username: string;
  displayName: string;
  followers: number;
  winRate: number;
  avgReturn: number;
  recentCalls: number;
  lastActive: string;
}

export interface SentimentScore {
  bullish: number;
  bearish: number;
  neutral: number;
  overall: number; // -1 to 1
  totalTweets: number;
  topTweet: Tweet | null;
}

// ── AI Research ─────────────────────────

export interface ResearchBriefing {
  query: string;
  timestamp: string;
  overview: string;
  sentiment: string;
  keyVoices: string;
  riskAssessment: string;
  verdict: string;
  sources: string[];
}
