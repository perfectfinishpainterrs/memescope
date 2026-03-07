import {
  formatUsd,
  formatNumber,
  formatPrice,
  formatPct,
  shortenAddress,
  isValidSolanaAddress,
  isValidEvmAddress,
  detectChain,
  getSafetyGrade,
} from "@/lib/utils";

// ── formatUsd ──────────────────────────

describe("formatUsd", () => {
  it("formats millions", () => {
    expect(formatUsd(2_500_000)).toBe("$2.5M");
  });

  it("formats thousands", () => {
    expect(formatUsd(45_300)).toBe("$45.3K");
  });

  it("formats small values", () => {
    expect(formatUsd(12.34)).toBe("$12.34");
  });

  it("handles zero", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("handles negative millions", () => {
    expect(formatUsd(-3_000_000)).toBe("$-3.0M");
  });
});

// ── formatNumber ───────────────────────

describe("formatNumber", () => {
  it("formats millions", () => {
    expect(formatNumber(1_200_000)).toBe("1.2M");
  });

  it("formats thousands", () => {
    expect(formatNumber(5_400)).toBe("5.4K");
  });

  it("formats small numbers with locale", () => {
    const result = formatNumber(999);
    expect(result).toBeDefined();
  });
});

// ── formatPrice ────────────────────────

describe("formatPrice", () => {
  it("formats very small prices with 9 decimals", () => {
    expect(formatPrice(0.0000001)).toMatch(/^0\.000000\d+$/);
  });

  it("formats small prices with 6 decimals", () => {
    expect(formatPrice(0.00012)).toBe("0.000120");
  });

  it("formats sub-dollar prices with 4 decimals", () => {
    expect(formatPrice(0.5)).toBe("0.5000");
  });

  it("formats dollar-plus prices with 2 decimals", () => {
    expect(formatPrice(42.5)).toBe("42.50");
  });
});

// ── formatPct ──────────────────────────

describe("formatPct", () => {
  it("adds + sign for positive", () => {
    expect(formatPct(12.3)).toBe("+12.3%");
  });

  it("shows - sign for negative", () => {
    expect(formatPct(-5.7)).toBe("-5.7%");
  });

  it("adds + sign for zero", () => {
    expect(formatPct(0)).toBe("+0.0%");
  });
});

// ── shortenAddress ─────────────────────

describe("shortenAddress", () => {
  it("shortens long addresses", () => {
    const addr = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    expect(shortenAddress(addr)).toBe("7xKX...gAsU");
  });

  it("returns short addresses as-is", () => {
    expect(shortenAddress("abc")).toBe("abc");
  });

  it("supports custom char count", () => {
    const addr = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    expect(shortenAddress(addr, 6)).toBe("7xKXtg...osgAsU");
  });
});

// ── Address validators ─────────────────

describe("isValidSolanaAddress", () => {
  it("accepts valid Solana addresses", () => {
    expect(isValidSolanaAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")).toBe(true);
  });

  it("rejects EVM addresses", () => {
    expect(isValidSolanaAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidSolanaAddress("")).toBe(false);
  });
});

describe("isValidEvmAddress", () => {
  it("accepts valid EVM addresses", () => {
    expect(isValidEvmAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(true);
  });

  it("rejects Solana addresses", () => {
    expect(isValidEvmAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")).toBe(false);
  });

  it("rejects short addresses", () => {
    expect(isValidEvmAddress("0x1234")).toBe(false);
  });
});

describe("detectChain", () => {
  it("detects Solana", () => {
    expect(detectChain("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")).toBe("SOL");
  });

  it("detects EVM", () => {
    expect(detectChain("0x1234567890abcdef1234567890abcdef12345678")).toBe("EVM");
  });

  it("returns null for invalid", () => {
    expect(detectChain("not-an-address")).toBeNull();
  });
});

// ── getSafetyGrade ─────────────────────

describe("getSafetyGrade", () => {
  it("returns SAFE for scores >= 70", () => {
    expect(getSafetyGrade(70)).toEqual({ grade: "SAFE", color: "#00ff88" });
    expect(getSafetyGrade(100)).toEqual({ grade: "SAFE", color: "#00ff88" });
  });

  it("returns CAUTION for scores 40-69", () => {
    expect(getSafetyGrade(40)).toEqual({ grade: "CAUTION", color: "#ffd000" });
    expect(getSafetyGrade(69)).toEqual({ grade: "CAUTION", color: "#ffd000" });
  });

  it("returns DANGER for scores < 40", () => {
    expect(getSafetyGrade(0)).toEqual({ grade: "DANGER", color: "#ff3366" });
    expect(getSafetyGrade(39)).toEqual({ grade: "DANGER", color: "#ff3366" });
  });
});
