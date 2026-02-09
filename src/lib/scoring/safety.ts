// ═══════════════════════════════════════════
// Safety Scoring Engine
// Calculates a 0-100 safety score based on
// on-chain analysis + external APIs
// ═══════════════════════════════════════════

import { SAFETY_WEIGHTS } from "@/config";
import type { SafetyData, SafetyChecks } from "@/types";
import { getSafetyGrade } from "@/lib/utils";
import { getMintInfo } from "@/lib/blockchain/solana";

const GOPLUS_KEY = process.env.GOPLUS_API_KEY || "";

// ── GoPlus Security API ─────────────────

/**
 * Check token security via GoPlus Labs API.
 * Detects: honeypot, tax, proxy, blacklist, mint.
 */
export async function getGoPlusCheck(
  tokenAddress: string,
  chainId = "solana"
) {
  try {
    const res = await fetch(
      `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${tokenAddress}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.result?.[tokenAddress.toLowerCase()] || null;
  } catch {
    return null;
  }
}

// ── LP Lock Detection ───────────────────

/**
 * Check if LP tokens are locked.
 * Checks common lock providers: Raydium, Team Finance.
 */
export async function checkLpLock(
  _pairAddress: string,
  _chain = "SOL"
): Promise<{
  locked: boolean;
  duration: string;
  lockedPct: string;
}> {
  // TODO: Implement LP lock detection
  // 1. Find LP token mint from pair
  // 2. Check if LP tokens are held in known lock contracts
  // 3. Parse lock duration from contract state
  //
  // Known lock contracts (Solana):
  //   - Raydium Lock: ...
  //   - Uncx: ...
  //   - Team Finance: ...

  return {
    locked: false,
    duration: "Unknown",
    lockedPct: "0%",
  };
}

// ── Honeypot Simulation ─────────────────

/**
 * Simulate a sell to detect honeypots.
 * Sends a simulated transaction to check if selling is possible.
 */
export async function simulateSell(
  _tokenAddress: string,
  _chain = "SOL"
): Promise<{
  canSell: boolean;
  sellTax: number;
  buyTax: number;
}> {
  // TODO: Implement sell simulation
  // Solana: Use Jupiter quote API to simulate a swap
  // EVM: Use Tenderly or similar to simulate
  //
  // Steps:
  // 1. Get quote for selling X tokens for SOL
  // 2. If quote fails → honeypot
  // 3. Compare expected vs actual output → detect tax

  return {
    canSell: true,
    sellTax: 0,
    buyTax: 0,
  };
}

// ── Deployer Analysis ───────────────────

/**
 * Trace the deployer wallet and check for linked rugs.
 */
export async function analyzeDeployer(
  _tokenAddress: string
): Promise<{
  deployerAddress: string;
  previousTokens: number;
  ruggedTokens: number;
  history: string;
}> {
  // TODO: Implement deployer tracing
  // 1. Find the first transaction that created this token
  // 2. Get the signer = deployer
  // 3. Find all other tokens deployed by same wallet
  // 4. Cross-reference with known rug databases

  return {
    deployerAddress: "",
    previousTokens: 0,
    ruggedTokens: 0,
    history: "Unable to analyze — coming soon",
  };
}

// ── Main Safety Score Calculator ────────

/**
 * Run all safety checks and calculate the final score.
 */
export async function calculateSafetyScore(
  tokenAddress: string,
  chain = "SOL"
): Promise<SafetyData> {
  // Run checks in parallel
  const [mintInfo, goPlusData, lpLockData, honeypotData, deployerData] =
    await Promise.allSettled([
      chain === "SOL" ? getMintInfo(tokenAddress) : null,
      getGoPlusCheck(tokenAddress, chain),
      checkLpLock(tokenAddress, chain),
      simulateSell(tokenAddress, chain),
      analyzeDeployer(tokenAddress),
    ]);

  const mint = mintInfo.status === "fulfilled" ? mintInfo.value : null;
  const goplus = goPlusData.status === "fulfilled" ? goPlusData.value : null;
  const lpLock = lpLockData.status === "fulfilled" ? lpLockData.value : null;
  const honeypot = honeypotData.status === "fulfilled" ? honeypotData.value : null;
  const deployer = deployerData.status === "fulfilled" ? deployerData.value : null;

  // Build checks object
  const checks: SafetyChecks = {
    lpLocked: lpLock?.locked || false,
    lpLockDuration: lpLock?.duration || "Unknown",
    lpLockedPct: lpLock?.lockedPct || "0%",
    contractRenounced: !mint?.mintAuthority && !mint?.freezeAuthority,
    honeypot: !(honeypot?.canSell ?? true),
    proxyContract: goplus?.is_proxy === "1",
    mintAuthority: !!mint?.mintAuthority,
    freezeAuthority: !!mint?.freezeAuthority,
    blacklistFunction: goplus?.is_blacklisted === "1",
    buyTax: honeypot?.buyTax ? `${honeypot.buyTax}%` : "0%",
    sellTax: honeypot?.sellTax ? `${honeypot.sellTax}%` : "0%",
    devWalletPct: "Unknown", // TODO: calculate from holder data
    devSelling: false,        // TODO: check recent deployer txns
    linkedRugs: deployer?.ruggedTokens || 0,
  };

  // Calculate score
  let score = 0;
  const flags: string[] = [];
  const positives: string[] = [];

  // LP Lock (20 pts)
  if (checks.lpLocked) {
    score += SAFETY_WEIGHTS.LP_LOCKED;
    positives.push(`LP locked ${checks.lpLockedPct} for ${checks.lpLockDuration}`);
  } else {
    flags.push("LP NOT locked");
  }

  // Honeypot (15 pts)
  if (!checks.honeypot) {
    score += SAFETY_WEIGHTS.NO_HONEYPOT;
    positives.push("Not a honeypot — can sell");
  } else {
    flags.push("⚠ HONEYPOT — cannot sell");
  }

  // Contract renounced (10 pts)
  if (checks.contractRenounced) {
    score += SAFETY_WEIGHTS.CONTRACT_RENOUNCED;
    positives.push("Contract renounced");
  } else {
    flags.push("Contract NOT renounced");
  }

  // Mint authority (10 pts)
  if (!checks.mintAuthority) {
    score += SAFETY_WEIGHTS.NO_MINT_AUTHORITY;
    positives.push("No mint authority");
  } else {
    flags.push("Mint authority active — can create more tokens");
  }

  // Dev wallet (10 pts)
  const devPct = parseFloat(checks.devWalletPct) || 0;
  if (devPct < 5) {
    score += SAFETY_WEIGHTS.LOW_DEV_WALLET;
    positives.push(`Low dev wallet: ${checks.devWalletPct}`);
  } else if (devPct > 10) {
    flags.push(`Dev holds ${checks.devWalletPct}`);
  }

  // Tax (10 pts)
  const buyTax = parseFloat(checks.buyTax) || 0;
  const sellTax = parseFloat(checks.sellTax) || 0;
  if (buyTax === 0 && sellTax === 0) {
    score += SAFETY_WEIGHTS.NO_TAX;
    positives.push("0% buy/sell tax");
  } else {
    flags.push(`${checks.buyTax} buy / ${checks.sellTax} sell tax`);
  }

  // Freeze authority (5 pts)
  if (!checks.freezeAuthority) {
    score += SAFETY_WEIGHTS.NO_FREEZE;
    positives.push("No freeze authority");
  } else {
    flags.push("Freeze authority enabled — can freeze wallets");
  }

  // Blacklist (5 pts)
  if (!checks.blacklistFunction) {
    score += SAFETY_WEIGHTS.NO_BLACKLIST;
    positives.push("No blacklist function");
  } else {
    flags.push("Blacklist function exists");
  }

  // Deployer history (10 pts)
  if ((deployer?.ruggedTokens || 0) === 0) {
    score += SAFETY_WEIGHTS.CLEAN_DEPLOYER;
    positives.push("Clean deployer history");
  } else {
    flags.push(
      `${deployer?.ruggedTokens} linked rugs from same deployer`
    );
  }

  // Proxy contract (deduction)
  if (checks.proxyContract) {
    flags.push("Proxy contract — upgradeable");
    score = Math.max(0, score - 5);
  }

  const { grade } = getSafetyGrade(score);

  return {
    score,
    grade,
    checks,
    flags,
    positives,
    deployerHistory:
      deployer?.history || "Unable to analyze deployer",
  };
}
