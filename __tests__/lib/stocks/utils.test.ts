import { describe, it, expect } from "vitest";
import {
  sanitizeSymbol,
  sanitizeIndexSymbol,
  formatPrice,
  formatVolume,
  formatTradingValue,
} from "@/lib/stocks/utils";

describe("sanitizeSymbol", () => {
  it("accepts 6-digit stock codes", () => {
    expect(sanitizeSymbol("005930")).toBe("005930");
  });

  it("accepts Q-prefixed KOSDAQ codes", () => {
    expect(sanitizeSymbol("Q263750")).toBe("Q263750");
  });

  it("uppercases the result", () => {
    expect(sanitizeSymbol("q263750")).toBe("Q263750");
  });

  it("trims whitespace", () => {
    expect(sanitizeSymbol("  005930  ")).toBe("005930");
  });

  it("rejects non-numeric codes", () => {
    expect(sanitizeSymbol("AAPL")).toBeNull();
  });

  it("rejects codes longer than 7 characters", () => {
    expect(sanitizeSymbol("00593011")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(sanitizeSymbol("")).toBeNull();
  });
});

describe("sanitizeIndexSymbol", () => {
  it("accepts valid IDX_ symbols", () => {
    expect(sanitizeIndexSymbol("IDX_1")).toBe("IDX_1");
    expect(sanitizeIndexSymbol("IDX_200")).toBe("IDX_200");
  });

  it("uppercases the result", () => {
    expect(sanitizeIndexSymbol("idx_1")).toBe("IDX_1");
  });

  it("rejects plain stock symbols", () => {
    expect(sanitizeIndexSymbol("005930")).toBeNull();
  });

  it("rejects IDX_ without digits", () => {
    expect(sanitizeIndexSymbol("IDX_")).toBeNull();
  });
});

describe("formatPrice", () => {
  it("formats numbers with locale separators", () => {
    expect(formatPrice(75000)).toBe("75,000");
  });

  it("returns dash for zero", () => {
    expect(formatPrice(0)).toBe("-");
  });

  it("returns dash for negative", () => {
    expect(formatPrice(-100)).toBe("-");
  });

  it("returns dash for NaN", () => {
    expect(formatPrice(NaN)).toBe("-");
  });

  it("returns dash for Infinity", () => {
    expect(formatPrice(Infinity)).toBe("-");
  });
});

describe("formatVolume", () => {
  it("formats small volumes in units", () => {
    expect(formatVolume(5000)).toBe("5,000주");
  });

  it("formats 10k+ as 만주", () => {
    expect(formatVolume(50_000)).toBe("5만주");
  });

  it("formats 100M+ as 억주", () => {
    expect(formatVolume(200_000_000)).toBe("2.0억주");
  });

  it("returns dash for zero", () => {
    expect(formatVolume(0)).toBe("-");
  });
});

describe("formatTradingValue", () => {
  it("formats 100M+ as 억", () => {
    expect(formatTradingValue(500_000_000)).toBe("5억");
  });

  it("formats 1T+ as 조", () => {
    expect(formatTradingValue(2_000_000_000_000)).toBe("2.0조");
  });

  it("formats smaller values as 만", () => {
    expect(formatTradingValue(50_000_000)).toBe("5,000만");
  });

  it("returns dash for zero", () => {
    expect(formatTradingValue(0)).toBe("-");
  });
});
