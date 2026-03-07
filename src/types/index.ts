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
  chartAnalysis?: string;
  holderAnalysis?: string;
  sentiment: string;
  keyVoices: string;
  riskAssessment: string;
  verdict: string;
  sources: string[];
}

// ── User / Auth ─────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  tier: "free" | "pro";
  settings: Record<string, unknown>;
  created_at: string;
}

export interface SavedWallet {
  id: string;
  user_id: string;
  address: string;
  chain: Chain;
  label: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  token_address: string;
  chain: Chain;
  label: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  token_address: string;
  chain: Chain;
  alert_type:
    | "price_above"
    | "price_below"
    | "safety_drop"
    | "holder_drop"
    | "whale_move";
  threshold: Record<string, number>;
  enabled: boolean;
  last_triggered: string | null;
  created_at: string;
}

export interface ScanHistoryEntry {
  id: string;
  user_id: string;
  address: string;
  chain: Chain;
  scanned_at: string;
}

// ── Saved Tokens ──────────────────────────

export interface SavedToken {
  id: string;
  user_id: string;
  token_address: string;
  chain: Chain;
  label: string | null;
  notes: string | null;
  created_at: string;
}

// ── Community / Mentions ──────────────────

export interface TokenMention {
  source: 'twitter' | 'telegram' | 'reddit';
  text: string;
  author: string;
  timestamp: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  url?: string;
}

export interface CommunityData {
  twitterFollowers: number;
  twitterMentions24h: number;
  telegramMembers: number;
  discordMembers: number;
  recentMentions: TokenMention[];
}
