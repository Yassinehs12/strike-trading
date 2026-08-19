import { describe, it, expect } from "vitest";
import { PAIRS, num, fmt, clamp01to5 } from "./positionCalc";

describe("num", () => {
  it("parses a numeric string", () => {
    expect(num("42.5")).toBe(42.5);
  });

  it("returns 0 for an empty string, null, or undefined", () => {
    expect(num("")).toBe(0);
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
  });

  it("returns 0 for a non-numeric string rather than NaN", () => {
    expect(num("not a number")).toBe(0);
  });
});

describe("fmt", () => {
  it("formats with 2 decimal places by default", () => {
    expect(fmt(1.5)).toBe("1.5");
    expect(fmt(1234.5)).toBe("1,234.5");
  });

  it("respects a custom decimal-place argument", () => {
    expect(fmt(1.23456, 3)).toBe("1.235");
  });
});

describe("clamp01to5", () => {
  it("passes through values already within 0-5", () => {
    expect(clamp01to5(2.5)).toBe(2.5);
  });

  it("clamps negative values to 0", () => {
    expect(clamp01to5(-1)).toBe(0);
  });

  it("clamps values above 5 down to 5", () => {
    expect(clamp01to5(12)).toBe(5);
  });
});

describe("PAIRS", () => {
  it("gives every instrument a positive pip size and pip value", () => {
    for (const [symbol, spec] of Object.entries(PAIRS)) {
      expect(spec.pipSize, `${symbol}.pipSize`).toBeGreaterThan(0);
      expect(spec.pipValue, `${symbol}.pipValue`).toBeGreaterThan(0);
    }
  });

  it("tags every instrument with a recognized asset type", () => {
    const validTypes = new Set(["Forex", "Metal", "Index", "Crypto"]);
    for (const [symbol, spec] of Object.entries(PAIRS)) {
      expect(validTypes.has(spec.type), `${symbol}.type = "${spec.type}"`).toBe(true);
    }
  });

  it("includes the core majors traders expect to find", () => {
    expect(PAIRS).toHaveProperty("EURUSD");
    expect(PAIRS).toHaveProperty("XAUUSD");
    expect(PAIRS).toHaveProperty("NDX100");
  });
});
