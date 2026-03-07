import type { SafetyData } from "@/types";

// Mock all external dependencies before importing the module
jest.mock("@/lib/blockchain/solana", () => ({
  getConnection: jest.fn(),
  getMintInfo: jest.fn().mockResolvedValue({
    mintAuthority: null,
    freezeAuthority: null,
  }),
}));

jest.mock("@/lib/blockchain/evm", () => ({
  simulateEvmSell: jest.fn().mockResolvedValue({
    honeypot: false,
    sellTax: 0,
  }),
  checkEvmContractOwnership: jest.fn().mockResolvedValue({
    renounced: true,
  }),
}));

jest.mock("@solana/web3.js", () => ({
  PublicKey: jest.fn().mockImplementation((key: string) => ({
    toBase58: () => key,
  })),
}));

// Mock fetch for GoPlus + Jupiter API calls
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () =>
    Promise.resolve({
      result: {},
      outAmount: "1000000",
      priceImpactPct: "0.5",
      inAmount: "1000000",
    }),
});

import { calculateSafetyScore } from "@/lib/scoring/safety";

describe("calculateSafetyScore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a SafetyData object with expected shape", async () => {
    const result = await calculateSafetyScore(
      "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "SOL"
    );

    // Verify shape
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("grade");
    expect(result).toHaveProperty("checks");
    expect(result).toHaveProperty("flags");
    expect(result).toHaveProperty("positives");
    expect(result).toHaveProperty("deployerHistory");

    // Verify types
    expect(typeof result.score).toBe("number");
    expect(["SAFE", "CAUTION", "DANGER"]).toContain(result.grade);
    expect(Array.isArray(result.flags)).toBe(true);
    expect(Array.isArray(result.positives)).toBe(true);
    expect(typeof result.deployerHistory).toBe("string");
  });

  it("returns score in valid range 0-100", async () => {
    const result = await calculateSafetyScore(
      "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "SOL"
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("assigns correct grade based on score", async () => {
    const result = await calculateSafetyScore(
      "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "SOL"
    );

    if (result.score >= 70) {
      expect(result.grade).toBe("SAFE");
    } else if (result.score >= 40) {
      expect(result.grade).toBe("CAUTION");
    } else {
      expect(result.grade).toBe("DANGER");
    }
  });

  it("includes checks object with expected properties", async () => {
    const result = await calculateSafetyScore(
      "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "SOL"
    );

    const { checks } = result;
    expect(checks).toHaveProperty("lpLocked");
    expect(checks).toHaveProperty("contractRenounced");
    expect(checks).toHaveProperty("honeypot");
    expect(checks).toHaveProperty("mintAuthority");
    expect(checks).toHaveProperty("freezeAuthority");
    expect(checks).toHaveProperty("buyTax");
    expect(checks).toHaveProperty("sellTax");
    expect(checks).toHaveProperty("linkedRugs");
  });
});
