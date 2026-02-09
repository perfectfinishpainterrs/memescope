// ═══════════════════════════════════════════
// EVM Blockchain Service (Phase 8)
// Handles: ETH, Base, BSC wallet scanning
// Uses: Moralis API + ethers.js
// ═══════════════════════════════════════════

// TODO: Implement in Phase 8
// - getWalletTokens(address, chain)
// - getWalletTransactions(address, chain)
// - getTokenHolders(contractAddress, chain)
// - getContractInfo(contractAddress, chain)
//   - owner, renounced, proxy, honeypot sim

export async function getEvmWalletTokens(
  _address: string,
  _chain: "ETH" | "BASE" | "BSC"
) {
  throw new Error("EVM support coming in Phase 8");
}
