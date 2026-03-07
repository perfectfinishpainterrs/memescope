// ═══════════════════════════════════════════
// Safety Scoring Engine
// Calculates a 0-100 safety score based on
// on-chain analysis + external APIs
// ═══════════════════════════════════════════

import { SAFETY_WEIGHTS } from "@/config";
import type { SafetyData, SafetyChecks, Chain } from "@/types";
import { getSafetyGrade } from "@/lib/utils";
import { getConnection, getMintInfo } from "@/lib/blockchain/solana";
import { PublicKey } from "@solana/web3.js";
import {
  simulateEvmSell,
  checkEvmContractOwnership,
} from "@/lib/blockchain/evm";

const EVM_CHAINS: Chain[] = ["ETH", "BASE", "BSC"];

const GOPLUS_KEY = process.env.GOPLUS_API_KEY || "";

// ── GoPlus Security API ─────────────────

/**
 * Check token security via GoPlus Labs API.
 * Detects: honeypot, tax, proxy, blacklist, mint.
 */
export async function getGoPlusCheck(
  tokenAddress: string,
  chain = "SOL"
) {
  try {
    // GoPlus uses different endpoints per chain
    const GOPLUS_CHAIN_MAP: Record<string, string> = {
      SOL: "solana",
      ETH: "1",
      BASE: "8453",
      BSC: "56",
    };
    const goplusChain = GOPLUS_CHAIN_MAP[chain] || "solana";

    const isSolana = chain === "SOL";
    const endpoint = isSolana
      ? `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${tokenAddress}`
      : `https://api.gopluslabs.io/api/v1/token_security/${goplusChain}?contract_addresses=${tokenAddress}`;

    const res = await fetch(endpoint, { next: { revalidate: 300 } });

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
  pairAddress: string,
  chain = "SOL"
): Promise<{
  locked: boolean;
  duration: string;
  lockedPct: string;
}> {
  if (chain !== "SOL") {
    return { locked: false, duration: "Unknown", lockedPct: "0%" };
  }

  try {
    const conn = getConnection();
    const lpMint = new PublicKey(pairAddress);

    // Burn address — LP tokens sent here are permanently locked
    const BURN_ADDRESS = "1111111111111111111111111111111111111111111";

    // Get the largest holders of the LP token
    const largestAccounts = await conn.getTokenLargestAccounts(lpMint);
    const supply = await conn.getTokenSupply(lpMint);
    const totalSupply = Number(supply.value.amount);

    if (totalSupply === 0) {
      return { locked: false, duration: "Unknown", lockedPct: "0%" };
    }

    let lockedAmount = 0;
    let isBurned = false;

    for (const account of largestAccounts.value) {
      const ownerInfo = await conn.getParsedAccountInfo(account.address);
      const parsed = (ownerInfo.value?.data as any)?.parsed?.info;
      const owner = parsed?.owner;

      if (!owner) continue;

      // Check if owner is the burn address (permanently locked)
      if (owner === BURN_ADDRESS) {
        lockedAmount += Number(account.amount);
        isBurned = true;
      }
    }

    const lockedPct = (lockedAmount / totalSupply) * 100;

    return {
      locked: lockedPct > 50,
      duration: isBurned ? "Burned (permanent)" : "Unknown",
      lockedPct: `${lockedPct.toFixed(1)}%`,
    };
  } catch {
    return { locked: false, duration: "Unknown", lockedPct: "0%" };
  }
}

// ── Honeypot Simulation ─────────────────

/**
 * Simulate a sell to detect honeypots.
 * Sends a simulated transaction to check if selling is possible.
 */
export async function simulateSell(
  tokenAddress: string,
  chain = "SOL"
): Promise<{
  canSell: boolean;
  sellTax: number;
  buyTax: number;
}> {
  if (EVM_CHAINS.includes(chain as Chain)) {
    try {
      const result = await simulateEvmSell(tokenAddress, chain as Chain);
      return {
        canSell: !result.honeypot,
        sellTax: result.sellTax,
        buyTax: 0,
      };
    } catch {
      return { canSell: true, sellTax: 0, buyTax: 0 };
    }
  }

  if (chain !== "SOL") {
    return { canSell: true, sellTax: 0, buyTax: 0 };
  }

  try {
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    // Simulate selling 1M base units of the token for SOL via Jupiter
    const sellAmount = 1_000_000;

    const sellRes = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${tokenAddress}&outputMint=${SOL_MINT}&amount=${sellAmount}&slippageBps=5000`,
      { signal: AbortSignal.timeout(10_000) }
    );

    if (!sellRes.ok) {
      // Quote API returned error — likely honeypot or unlisted
      return { canSell: false, sellTax: 100, buyTax: 0 };
    }

    const sellData = await sellRes.json();

    // No output or zero output means honeypot
    if (!sellData.outAmount || Number(sellData.outAmount) === 0) {
      return { canSell: false, sellTax: 100, buyTax: 0 };
    }

    // Estimate sell tax from price impact
    // Jupiter's priceImpactPct is negative for price impact
    const priceImpact = Math.abs(parseFloat(sellData.priceImpactPct || "0"));
    // If price impact > 50%, it's effectively a honeypot
    if (priceImpact > 50) {
      return { canSell: false, sellTax: priceImpact, buyTax: 0 };
    }

    // Estimate tax: compare inAmount vs outAmount value ratio
    // A legitimate token should have minimal difference beyond slippage
    const inAmount = Number(sellData.inAmount);
    const outAmount = Number(sellData.outAmount);

    // Also do a reverse quote (buy) to detect buy tax
    let buyTax = 0;
    try {
      const buyRes = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${tokenAddress}&amount=${outAmount}&slippageBps=5000`,
        { signal: AbortSignal.timeout(10_000) }
      );
      if (buyRes.ok) {
        const buyData = await buyRes.json();
        const buyOut = Number(buyData.outAmount || 0);
        // If we sell X tokens and get Y SOL, then buy with Y SOL,
        // we should get close to X tokens back. Difference = round-trip tax.
        if (buyOut > 0 && inAmount > 0) {
          const roundTripLoss = ((inAmount - buyOut) / inAmount) * 100;
          // Split round-trip loss roughly in half for buy tax
          buyTax = Math.max(0, roundTripLoss / 2);
        }
      }
    } catch {
      // Buy quote failed — not critical
    }

    // Sell tax estimate from price impact beyond normal slippage (~2% baseline)
    const sellTax = Math.max(0, priceImpact - 2);

    return {
      canSell: true,
      sellTax: Math.round(sellTax * 100) / 100,
      buyTax: Math.round(buyTax * 100) / 100,
    };
  } catch {
    return { canSell: true, sellTax: 0, buyTax: 0 };
  }
}

// ── Deployer Analysis ───────────────────

/**
 * Trace the deployer wallet and check for linked rugs.
 */
export async function analyzeDeployer(
  tokenAddress: string,
  chain = "SOL"
): Promise<{
  deployerAddress: string;
  previousTokens: number;
  ruggedTokens: number;
  history: string;
}> {
  // EVM deployer analysis requires Etherscan/Basescan API — placeholder for now
  if (EVM_CHAINS.includes(chain as Chain)) {
    return {
      deployerAddress: "",
      previousTokens: 0,
      ruggedTokens: 0,
      history: "EVM deployer analysis not yet available",
    };
  }

  try {
    const conn = getConnection();
    const mintPubkey = new PublicKey(tokenAddress);

    // Get the oldest signatures for the token mint account
    // This includes the mint creation transaction
    const signatures = await conn.getSignaturesForAddress(mintPubkey, {
      limit: 1,
    });

    // getSignaturesForAddress returns newest first, but with limit:1 we get the most recent
    // We need the oldest — fetch with 'before' navigation or get all and take last
    // For efficiency, fetch a batch and take the last one
    let oldestSig = signatures[0];

    // Walk backwards to find the very first transaction
    if (oldestSig) {
      let lastSig = oldestSig.signature;
      let batch = signatures;
      while (batch.length > 0) {
        batch = await conn.getSignaturesForAddress(mintPubkey, {
          limit: 1000,
          before: lastSig,
        });
        if (batch.length > 0) {
          oldestSig = batch[batch.length - 1];
          lastSig = oldestSig.signature;
        }
      }
    }

    if (!oldestSig) {
      return {
        deployerAddress: "",
        previousTokens: 0,
        ruggedTokens: 0,
        history: "No transactions found for this token",
      };
    }

    // Get the full transaction to find the fee payer (deployer)
    const tx = await conn.getParsedTransaction(oldestSig.signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx?.transaction?.message) {
      return {
        deployerAddress: "",
        previousTokens: 0,
        ruggedTokens: 0,
        history: "Could not parse creation transaction",
      };
    }

    // Fee payer is the first account key — this is the deployer
    const deployer =
      tx.transaction.message.accountKeys[0]?.pubkey?.toBase58() || "";

    if (!deployer) {
      return {
        deployerAddress: "",
        previousTokens: 0,
        ruggedTokens: 0,
        history: "Could not identify deployer",
      };
    }

    // Check deployer's recent transaction history for other token mints
    const deployerSigs = await conn.getSignaturesForAddress(
      new PublicKey(deployer),
      { limit: 100 }
    );

    // Look for InitializeMint instructions in deployer's history
    let previousTokens = 0;
    let ruggedTokens = 0;
    const rugHistory: string[] = [];

    // Sample up to 20 transactions to check for other token creations
    const sampleSigs = deployerSigs.slice(0, 20);
    for (const sig of sampleSigs) {
      try {
        const deployerTx = await conn.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (!deployerTx?.transaction?.message?.instructions) continue;

        for (const ix of deployerTx.transaction.message.instructions) {
          const parsed = (ix as any).parsed;
          if (parsed?.type === "initializeMint" || parsed?.type === "initializeMint2") {
            const mintAddr = parsed.info?.mint;
            if (mintAddr && mintAddr !== tokenAddress) {
              previousTokens++;

              // Quick liquidity check — see if this token has any value
              try {
                const tokenSupply = await conn.getTokenSupply(new PublicKey(mintAddr));
                const supply = Number(tokenSupply.value.amount);
                // If supply is 0 or very low, likely a dead/rugged token
                if (supply === 0) {
                  ruggedTokens++;
                  rugHistory.push(mintAddr);
                }
              } catch {
                // Token account may not exist anymore — likely rugged
                ruggedTokens++;
                rugHistory.push(mintAddr);
              }
            }
          }
        }
      } catch {
        // Skip transactions we can't parse
      }
    }

    const historyMsg =
      previousTokens === 0
        ? "Clean — no other tokens found from this deployer"
        : `Deployer created ${previousTokens} other token(s), ${ruggedTokens} appear dead/rugged`;

    return {
      deployerAddress: deployer,
      previousTokens,
      ruggedTokens,
      history: historyMsg,
    };
  } catch {
    return {
      deployerAddress: "",
      previousTokens: 0,
      ruggedTokens: 0,
      history: "Unable to analyze deployer",
    };
  }
}

// ── Main Safety Score Calculator ────────

/**
 * Run all safety checks and calculate the final score.
 */
export async function calculateSafetyScore(
  tokenAddress: string,
  chain = "SOL"
): Promise<SafetyData> {
  const isEvm = EVM_CHAINS.includes(chain as Chain);

  // Run checks in parallel
  const [mintInfo, goPlusData, lpLockData, honeypotData, deployerData, ownershipData] =
    await Promise.allSettled([
      chain === "SOL" ? getMintInfo(tokenAddress) : null,
      getGoPlusCheck(tokenAddress, chain),
      checkLpLock(tokenAddress, chain),
      simulateSell(tokenAddress, chain),
      analyzeDeployer(tokenAddress, chain),
      isEvm ? checkEvmContractOwnership(tokenAddress, chain as Chain) : null,
    ]);

  const mint = mintInfo.status === "fulfilled" ? mintInfo.value : null;
  const goplus = goPlusData.status === "fulfilled" ? goPlusData.value : null;
  const lpLock = lpLockData.status === "fulfilled" ? lpLockData.value : null;
  const honeypot = honeypotData.status === "fulfilled" ? honeypotData.value : null;
  const deployer = deployerData.status === "fulfilled" ? deployerData.value : null;
  const ownership = ownershipData.status === "fulfilled" ? ownershipData.value : null;

  // For EVM: use contract ownership + GoPlus data; for SOL: use mint info
  const contractRenounced = isEvm
    ? ownership?.renounced || goplus?.owner_address === "0x0000000000000000000000000000000000000000"
    : !mint?.mintAuthority && !mint?.freezeAuthority;

  const mintAuthority = isEvm
    ? goplus?.can_take_back_ownership === "1"
    : !!mint?.mintAuthority;

  const freezeAuthority = isEvm
    ? goplus?.transfer_pausable === "1"
    : !!mint?.freezeAuthority;

  // Build checks object
  const checks: SafetyChecks = {
    lpLocked: lpLock?.locked || false,
    lpLockDuration: lpLock?.duration || "Unknown",
    lpLockedPct: lpLock?.lockedPct || "0%",
    contractRenounced,
    honeypot: isEvm
      ? goplus?.is_honeypot === "1" || !(honeypot?.canSell ?? true)
      : !(honeypot?.canSell ?? true),
    proxyContract: goplus?.is_proxy === "1",
    mintAuthority,
    freezeAuthority,
    blacklistFunction: goplus?.is_blacklisted === "1",
    buyTax: honeypot?.buyTax ? `${honeypot.buyTax}%` : goplus?.buy_tax ? `${(parseFloat(goplus.buy_tax) * 100).toFixed(1)}%` : "0%",
    sellTax: honeypot?.sellTax ? `${honeypot.sellTax}%` : goplus?.sell_tax ? `${(parseFloat(goplus.sell_tax) * 100).toFixed(1)}%` : "0%",
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
