// ═══════════════════════════════════════════
// Moralis REST API Integration
// SOL-first, EVM secondary — no SDK needed
// ═══════════════════════════════════════════

import { API_URLS } from "@/config";
import type { Chain } from "@/types";

const MORALIS_KEY = process.env.MORALIS_API_KEY || "";

const EVM_CHAIN_MAP: Record<string, string> = {
  ETH: "0x1",
  BASE: "0x2105",
  BSC: "0x38",
};

async function moralisGet(path: string, evm = false) {
  if (!MORALIS_KEY) throw new Error("MORALIS_API_KEY not configured");
  const base = evm ? API_URLS.MORALIS_EVM : API_URLS.MORALIS_SOL;
  const res = await fetch(`${base}${path}`, {
    headers: {
      "X-API-Key": MORALIS_KEY,
      accept: "application/json",
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Moralis ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── SOL Functions ───────────────────────

export async function getMoralisTokenPrice(
  address: string,
  chain = "mainnet"
) {
  return moralisGet(`/token/${chain}/${address}/price`);
}

export async function getMoralisWalletTokens(
  address: string,
  chain = "mainnet"
) {
  return moralisGet(`/account/${chain}/${address}/tokens`);
}

export async function getMoralisTokenMetadata(
  address: string,
  chain = "mainnet"
) {
  return moralisGet(`/token/${chain}/${address}/metadata`);
}

export async function getMoralisWalletBalance(
  address: string,
  chain = "mainnet"
) {
  return moralisGet(`/account/${chain}/${address}/balance`);
}

export async function getMoralisWalletPortfolio(
  address: string,
  chain = "mainnet"
) {
  return moralisGet(`/account/${chain}/${address}/portfolio`);
}

export async function getMoralisTokenPairs(
  address: string,
  chain = "mainnet"
) {
  return moralisGet(`/token/${chain}/${address}/pairs`);
}

export async function getMoralisTokenStats(
  address: string,
  chain = "mainnet"
) {
  return moralisGet(`/token/${chain}/${address}/analytics`);
}

export async function getMoralisSolTopHolders(
  address: string,
  chain = "mainnet"
) {
  return moralisGet(`/token/${chain}/${address}/top-holders`);
}

export async function getMoralisSolTokenSwaps(
  address: string,
  chain = "mainnet",
  pages = 3
) {
  const allResults: any[] = [];
  let cursor: string | null = null;

  for (let i = 0; i < pages; i++) {
    const cursorParam = cursor ? `&cursor=${cursor}` : "";
    const data = await moralisGet(
      `/token/${chain}/${address}/swaps?limit=100${cursorParam}`
    );
    const results = data?.result || [];
    allResults.push(...results);
    cursor = data?.cursor || null;
    if (!cursor || results.length < 100) break;
  }

  return { result: allResults };
}

// ── EVM Functions ───────────────────────

export async function getMoralisEvmTokenPrice(
  address: string,
  chain: Chain | string = "ETH"
) {
  const chainId = EVM_CHAIN_MAP[chain] || "0x1";
  return moralisGet(`/erc20/${address}/price?chain=${chainId}`, true);
}

export async function getMoralisEvmWalletTokens(
  walletAddress: string,
  chain: Chain | string = "ETH"
) {
  const chainId = EVM_CHAIN_MAP[chain] || "0x1";
  return moralisGet(`/${walletAddress}/erc20?chain=${chainId}`, true);
}

export async function getMoralisEvmTokenHolders(
  address: string,
  chain: Chain | string = "ETH"
) {
  const chainId = EVM_CHAIN_MAP[chain] || "0x1";
  return moralisGet(
    `/erc20/${address}/owners?chain=${chainId}&order=DESC`,
    true
  );
}

export async function getMoralisEvmWalletBalance(
  walletAddress: string,
  chain: Chain | string = "ETH"
) {
  const chainId = EVM_CHAIN_MAP[chain] || "0x1";
  return moralisGet(`/${walletAddress}/balance?chain=${chainId}`, true);
}

export async function getMoralisEvmTokenTransfers(
  address: string,
  chain: Chain | string = "ETH",
  limit = 100
) {
  const chainId = EVM_CHAIN_MAP[chain] || "0x1";
  return moralisGet(
    `/erc20/${address}/transfers?chain=${chainId}&order=DESC&limit=${limit}`,
    true
  );
}

export async function getMoralisEvmWalletHistory(
  walletAddress: string,
  chain: Chain | string = "ETH",
  limit = 100
) {
  const chainId = EVM_CHAIN_MAP[chain] || "0x1";
  return moralisGet(
    `/${walletAddress}/erc20/transfers?chain=${chainId}&order=DESC&limit=${limit}`,
    true
  );
}

export async function getMoralisEvmTokenMetadata(
  address: string,
  chain: Chain | string = "ETH"
) {
  const chainId = EVM_CHAIN_MAP[chain] || "0x1";
  return moralisGet(`/erc20/metadata?chain=${chainId}&addresses=${address}`, true);
}

export async function getMoralisEvmTokenPairs(
  address: string,
  chain: Chain | string = "ETH"
) {
  const chainId = EVM_CHAIN_MAP[chain] || "0x1";
  return moralisGet(`/${address}/pairs?chain=${chainId}`, true);
}

// ── Aggregated helpers ──────────────────

/**
 * Get comprehensive token info from Moralis (works for both SOL and EVM).
 */
export async function getMoralisTokenInfo(
  address: string,
  chain: Chain = "SOL"
) {
  const isEvm = chain !== "SOL";

  try {
    if (isEvm) {
      const [price, metadata] = await Promise.allSettled([
        getMoralisEvmTokenPrice(address, chain),
        getMoralisEvmTokenMetadata(address, chain),
      ]);

      return {
        price:
          price.status === "fulfilled" ? price.value?.usdPrice || 0 : 0,
        name:
          metadata.status === "fulfilled"
            ? metadata.value?.[0]?.name || null
            : null,
        symbol:
          metadata.status === "fulfilled"
            ? metadata.value?.[0]?.symbol || null
            : null,
        decimals:
          metadata.status === "fulfilled"
            ? metadata.value?.[0]?.decimals || 18
            : 18,
      };
    }

    // SOL
    const [price, metadata] = await Promise.allSettled([
      getMoralisTokenPrice(address),
      getMoralisTokenMetadata(address),
    ]);

    return {
      price:
        price.status === "fulfilled" ? price.value?.usdPrice || 0 : 0,
      name:
        metadata.status === "fulfilled"
          ? metadata.value?.name || null
          : null,
      symbol:
        metadata.status === "fulfilled"
          ? metadata.value?.symbol || null
          : null,
      decimals:
        metadata.status === "fulfilled"
          ? metadata.value?.decimals || 9
          : 9,
    };
  } catch {
    return { price: 0, name: null, symbol: null, decimals: 9 };
  }
}

/**
 * Get wallet overview from Moralis (SOL or EVM).
 */
export async function getMoralisWalletOverview(
  address: string,
  chain: Chain = "SOL"
) {
  const isEvm = chain !== "SOL";

  try {
    if (isEvm) {
      const [tokens, balance] = await Promise.allSettled([
        getMoralisEvmWalletTokens(address, chain),
        getMoralisEvmWalletBalance(address, chain),
      ]);

      return {
        tokens: tokens.status === "fulfilled" ? tokens.value || [] : [],
        nativeBalance:
          balance.status === "fulfilled"
            ? balance.value?.balance || "0"
            : "0",
      };
    }

    // SOL
    const [tokens, balance] = await Promise.allSettled([
      getMoralisWalletTokens(address),
      getMoralisWalletBalance(address),
    ]);

    return {
      tokens: tokens.status === "fulfilled" ? tokens.value || [] : [],
      nativeBalance:
        balance.status === "fulfilled"
          ? balance.value?.lamports || "0"
          : "0",
    };
  } catch {
    return { tokens: [], nativeBalance: "0" };
  }
}
