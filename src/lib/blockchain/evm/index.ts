// ═══════════════════════════════════════════
// EVM Blockchain Service (Phase 6)
// Handles: ETH, Base, BSC wallet scanning
// Uses: Moralis API + ethers.js
// ═══════════════════════════════════════════

import {
  getMoralisEvmWalletTokens,
  getMoralisEvmTokenPrice,
  getMoralisEvmTokenHolders,
} from "@/lib/blockchain/moralis";
import { ethers } from "ethers";
import type { Chain } from "@/types";

const CHAIN_MAP: Record<string, string> = {
  ETH: "0x1",
  BASE: "0x2105",
  BSC: "0x38",
};

const RPC_MAP: Record<string, string> = {
  ETH: "https://eth.llamarpc.com",
  BASE: "https://mainnet.base.org",
  BSC: "https://bsc-dataseed.binance.org",
};

function getProvider(chain: string) {
  const rpc = RPC_MAP[chain];
  if (!rpc) throw new Error(`Unsupported chain: ${chain}`);
  return new ethers.JsonRpcProvider(rpc);
}

function getChainId(chain: string) {
  return CHAIN_MAP[chain] || "0x1";
}

// ── Wallet tokens via Moralis ─────────────

export async function getEvmWalletTokens(address: string, chain: Chain) {
  return getMoralisEvmWalletTokens(address, chain);
}

// ── Token price via Moralis ───────────────

export async function getEvmTokenPrice(address: string, chain: Chain) {
  return getMoralisEvmTokenPrice(address, chain);
}

// ── Token holders via Moralis ─────────────

export async function getEvmTokenHolders(address: string, chain: Chain) {
  return getMoralisEvmTokenHolders(address, chain);
}

// ── Contract reads via ethers ─────────────

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
];

const OWNABLE_ABI = [
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
];

export async function getEvmTokenInfo(address: string, chain: Chain) {
  const provider = getProvider(chain);
  const contract = new ethers.Contract(address, ERC20_ABI, provider);
  const [name, symbol, decimals, totalSupply] = await Promise.allSettled([
    contract.name(),
    contract.symbol(),
    contract.decimals(),
    contract.totalSupply(),
  ]);
  return {
    name: name.status === "fulfilled" ? name.value : "Unknown",
    symbol: symbol.status === "fulfilled" ? symbol.value : "???",
    decimals: decimals.status === "fulfilled" ? Number(decimals.value) : 18,
    totalSupply:
      totalSupply.status === "fulfilled" ? totalSupply.value.toString() : "0",
  };
}

export async function checkEvmContractOwnership(
  address: string,
  chain: Chain
) {
  const provider = getProvider(chain);
  const contract = new ethers.Contract(address, OWNABLE_ABI, provider);
  try {
    const owner = await contract.owner();
    const renounced = owner === ethers.ZeroAddress;
    return { owner, renounced };
  } catch {
    return { owner: null, renounced: false }; // No owner function = not Ownable
  }
}

export async function simulateEvmSell(tokenAddress: string, chain: Chain) {
  const provider = getProvider(chain);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  try {
    const supply = await contract.totalSupply();
    if (supply === BigInt(0)) return { honeypot: true, sellTax: 100 };
    // For a more thorough check, would need to simulate a DEX swap
    // GoPlus check in safety.ts handles the heavy lifting
    return { honeypot: false, sellTax: 0 };
  } catch {
    return { honeypot: false, sellTax: 0 };
  }
}
