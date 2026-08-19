import { describe, it, expect } from "vitest";
import { fmtUSD, fmtUSD2, clamp, daysAgo, isoWeekKey, todayISO } from "./format";

describe("fmtUSD", () => {
  it("formats a whole-dollar amount with no decimals by default", () => {
    expect(fmtUSD(1234)).toBe("$1,234");
  });

  it("rounds rather than truncates decimals", () => {
    expect(fmtUSD(1234.6)).toBe("$1,235");
  });

  it("formats a negative amount with the sign preserved", () => {
    expect(fmtUSD(-500)).toBe("-$500");
  });
});

describe("fmtUSD2", () => {
  it("always shows exactly two decimal places", () => {
    expect(fmtUSD2(1234)).toBe("$1,234.00");
    expect(fmtUSD2(1234.5)).toBe("$1,234.50");
  });
});

describe("clamp", () => {
  it("returns the value unchanged when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to the minimum when below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps to the maximum when above range", () => {
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe("daysAgo", () => {
  // TODAY is a fixed constant (2026-07-10) from lib/mockData, not the real
  // current date, so this is fully deterministic regardless of when the
  // test suite actually runs.
  it("returns 0 for TODAY itself", () => {
    expect(daysAgo("2026-07-10")).toBe(0);
  });

  it("returns a positive count for a date before TODAY", () => {
    expect(daysAgo("2026-07-01")).toBe(9);
  });

  it("returns a negative count for a date after TODAY", () => {
    expect(daysAgo("2026-07-15")).toBe(-5);
  });
});

describe("isoWeekKey", () => {
  it("returns the correct ISO week for a known midweek date", () => {
    // Wednesday July 1, 2026 falls in ISO week 27 of 2026.
    expect(isoWeekKey(new Date(Date.UTC(2026, 6, 1)))).toBe("2026-W27");
  });

  it("assigns a late-December Monday to next year's week 1 when applicable", () => {
    // Dec 29, 2025 is a Monday and belongs to ISO week 1 of 2026.
    expect(isoWeekKey(new Date(Date.UTC(2025, 11, 29)))).toBe("2026-W01");
  });

  it("defaults to today when no date is passed", () => {
    expect(isoWeekKey()).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("todayISO", () => {
  it("returns today's date in YYYY-MM-DD format", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
