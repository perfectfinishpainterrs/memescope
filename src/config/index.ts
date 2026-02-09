// ═══════════════════════════════════════════
// MEMESCOPE — App Configuration
// ═══════════════════════════════════════════

export const APP_CONFIG = {
  name: "MEMESCOPE",
  tagline: "Wallet Scanner + Scam Detector",
  version: "0.1.0",
} as const;

// Supported chains
export const CHAINS = {
  SOL: { name: "Solana", color: "#9945ff", bgColor: "rgba(153,69,255,0.13)" },
  ETH: { name: "Ethereum", color: "#627eea", bgColor: "rgba(98,126,234,0.13)" },
  BASE: { name: "Base", color: "#0052ff", bgColor: "rgba(0,82,255,0.13)" },
  BSC: { name: "BSC", color: "#f0b90b", bgColor: "rgba(240,185,11,0.13)" },
} as const;

// Safety score thresholds
export const SAFETY_THRESHOLDS = {
  SAFE: { min: 70, color: "#00ff88", label: "SAFE" },
  CAUTION: { min: 40, color: "#ffd000", label: "CAUTION" },
  DANGER: { min: 0, color: "#ff3366", label: "DANGER" },
} as const;

// Safety score weights (total = 100)
export const SAFETY_WEIGHTS = {
  LP_LOCKED: 20,
  NO_HONEYPOT: 15,
  CONTRACT_RENOUNCED: 10,
  NO_MINT_AUTHORITY: 10,
  LOW_DEV_WALLET: 10, // < 5%
  NO_TAX: 10,
  NO_FREEZE: 5,
  NO_BLACKLIST: 5,
  CLEAN_DEPLOYER: 10,
  GOOD_DISTRIBUTION: 5,
} as const;

// Refresh intervals (ms)
export const REFRESH_INTERVALS = {
  PRICE: 30_000,       // 30s
  HOLDERS: 60_000,     // 1min
  SAFETY: 300_000,     // 5min
  TWITTER: 300_000,    // 5min
} as const;

// API endpoints
export const API_URLS = {
  HELIUS: "https://mainnet.helius-rpc.com",
  DEXSCREENER: "https://api.dexscreener.com/latest",
  BIRDEYE: "https://public-api.birdeye.so",
  GOPLUS: "https://api.gopluslabs.io/api/v1",
  GECKO_TERMINAL: "https://api.geckoterminal.com/api/v2",
  X_API: "https://api.x.com/2",
} as const;

// Known KOLs to track
export const DEFAULT_KOLS = [
  "MustStopMurad",
  "blknoiz06",
  "zachxbt",
  "CryptoKaleo",
  "DegenSpartan",
  "0xSisyphus",
  "ColdBloodShill",
  "GCRClassic",
  "loomdart",
  "inversebrah",
] as const;
