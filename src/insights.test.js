import { describe, it, expect } from "vitest";
import { computeInsights, filterTradesByPeriod } from "./insights";

const trade = (overrides = {}) => ({
  date: "2026-07-01", asset: "EURUSD", session: "London", setup: "Breakout",
  status: "Win", pnl: 50, holdingMinutes: 0, ...overrides,
});

describe("computeInsights", () => {
  it("stays not-ready below the minimum sample size (5 closed trades)", () => {
    const result = computeInsights([trade(), trade(), trade()]);
    expect(result.ready).toBe(false);
    expect(result.insights).toEqual([]);
    expect(result.sampleSize).toBe(3);
  });

  it("ignores open/pending trades when counting the sample", () => {
    const trades = [
      trade({ status: "Win" }), trade({ status: "Win" }), trade({ status: "Loss" }),
      trade({ status: "Win" }), trade({ status: "Loss" }),
      trade({ status: "Open" }), trade({ status: "Open" }),
    ];
    const result = computeInsights(trades);
    expect(result.sampleSize).toBe(5);
    expect(result.ready).toBe(true);
  });

  it("always leads with a summary line stating win rate and net P&L", () => {
    const trades = [
      trade({ pnl: 100 }), trade({ pnl: 100 }), trade({ pnl: 100 }),
      trade({ pnl: -50, status: "Loss" }), trade({ pnl: -50, status: "Loss" }),
    ];
    const result = computeInsights(trades, "week");
    expect(result.insights[0].type).toBe("summary");
    expect(result.insights[0].text).toMatch(/5 closed trades this week/);
    expect(result.insights[0].text).toMatch(/60% win rate/);
  });

  it("surfaces an asset as a strength when it clearly outperforms the rest (15+ point gap, 5+ trades)", () => {
    const trades = [
      // XAUUSD: 5 wins, 0 losses -> 100% win rate
      ...Array.from({ length: 5 }, () => trade({ asset: "XAUUSD", status: "Win" })),
      // Everything else: 1 win, 4 losses -> 20% win rate
      trade({ asset: "EURUSD", status: "Win" }),
      ...Array.from({ length: 4 }, () => trade({ asset: "EURUSD", status: "Loss" })),
    ];
    const result = computeInsights(trades);
    const assetInsight = result.insights.find((i) => i.text.includes("XAUUSD"));
    expect(assetInsight).toBeTruthy();
    expect(assetInsight.type).toBe("strength");
  });

  it("does not surface a group as a standout below the minimum group size", () => {
    // Only 2 XAUUSD trades — below MIN_SAMPLE (5) required to trust the pattern.
    const trades = [
      trade({ asset: "XAUUSD", status: "Win" }),
      trade({ asset: "XAUUSD", status: "Win" }),
      trade({ asset: "EURUSD", status: "Loss" }),
      trade({ asset: "EURUSD", status: "Loss" }),
      trade({ asset: "EURUSD", status: "Win" }),
    ];
    const result = computeInsights(trades);
    expect(result.insights.some((i) => i.text.includes("XAUUSD"))).toBe(false);
  });

  it("detects an active streak of 3+ trades in the same direction", () => {
    const trades = [
      trade({ date: "2026-07-01", status: "Loss" }),
      trade({ date: "2026-07-02", status: "Win" }),
      trade({ date: "2026-07-03", status: "Win" }),
      trade({ date: "2026-07-04", status: "Win" }),
      trade({ date: "2026-07-05", status: "Win" }),
    ];
    const result = computeInsights(trades);
    const streak = result.insights.find((i) => i.text.includes("streak"));
    expect(streak).toBeTruthy();
    expect(streak.text).toMatch(/4-trade win streak/);
    expect(streak.type).toBe("strength");
  });

  it("caps the returned insights at 6", () => {
    // Construct trades with several strong standout patterns simultaneously
    // to try to exceed the cap, then confirm it's still respected.
    const trades = [
      ...Array.from({ length: 5 }, () => trade({ asset: "XAUUSD", session: "London", setup: "A", date: "2026-07-01", status: "Win" })),
      ...Array.from({ length: 5 }, () => trade({ asset: "EURUSD", session: "NY", setup: "B", date: "2026-06-01", status: "Loss" })),
    ];
    const result = computeInsights(trades);
    expect(result.insights.length).toBeLessThanOrEqual(6);
  });
});

describe("filterTradesByPeriod", () => {
  it("keeps only trades within the given number of days from now", () => {
    const now = Date.now();
    const recent = new Date(now - 2 * 86400000).toISOString().slice(0, 10);
    const old = new Date(now - 40 * 86400000).toISOString().slice(0, 10);
    const trades = [trade({ date: recent }), trade({ date: old })];
    const filtered = filterTradesByPeriod(trades, 7);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].date).toBe(recent);
  });

  it("returns an empty array when no trades fall within the window", () => {
    const old = new Date(Date.now() - 100 * 86400000).toISOString().slice(0, 10);
    expect(filterTradesByPeriod([trade({ date: old })], 7)).toEqual([]);
  });
});
