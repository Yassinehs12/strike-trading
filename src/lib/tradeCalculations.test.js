import { describe, it, expect } from "vitest";
import {
  computeKPIs,
  computeStreaks,
  computeChallengeStats,
  computePaceProjection,
  equityCurve,
} from "./tradeCalculations";

// Minimal trade factory — only fills the fields these functions actually read,
// so each test stays readable and only overrides what it cares about.
const trade = (overrides = {}) => ({
  status: "Win",
  pnl: 100,
  fees: 0,
  date: "2026-07-01",
  holdingMinutes: 30,
  challengeId: "c1",
  ...overrides,
});

describe("computeKPIs", () => {
  it("returns all zeros for an empty trade list", () => {
    const kpis = computeKPIs([]);
    expect(kpis).toEqual({ total: 0, netProfit: 0, winRate: 0, profitFactor: 0, avgRR: 0 });
  });

  it("computes win rate, net profit, and profit factor for a mixed set", () => {
    const trades = [
      trade({ status: "Win", pnl: 200, fees: 2 }),
      trade({ status: "Win", pnl: 100, fees: 1 }),
      trade({ status: "Loss", pnl: -100, fees: 1 }),
    ];
    const kpis = computeKPIs(trades);
    expect(kpis.total).toBe(3);
    expect(kpis.winRate).toBeCloseTo((2 / 3) * 100);
    // net = (200-2) + (100-1) + (-100-1) = 196
    expect(kpis.netProfit).toBe(196);
    // grossProfit=300, grossLoss=100 -> profitFactor=3
    expect(kpis.profitFactor).toBe(3);
    // avgWin=150, avgLoss=100 -> avgRR=1.5
    expect(kpis.avgRR).toBe(1.5);
  });

  it("treats profit factor as Infinity when there are wins but zero losses", () => {
    const trades = [trade({ status: "Win", pnl: 50 })];
    expect(computeKPIs(trades).profitFactor).toBe(Infinity);
  });

  it("treats profit factor as 0 when there are neither wins nor losses", () => {
    const trades = [trade({ status: "BE", pnl: 0 })];
    expect(computeKPIs(trades).profitFactor).toBe(0);
  });
});

describe("computeStreaks", () => {
  it("finds the current streak and the longest win/loss streaks", () => {
    // Chronological order: W, W, L, W, W, W (BE trades are excluded entirely)
    const trades = [
      trade({ status: "Win", date: "2026-07-01" }),
      trade({ status: "Win", date: "2026-07-02" }),
      trade({ status: "BE", date: "2026-07-03" }),
      trade({ status: "Loss", date: "2026-07-04" }),
      trade({ status: "Win", date: "2026-07-05" }),
      trade({ status: "Win", date: "2026-07-06" }),
      trade({ status: "Win", date: "2026-07-07" }),
    ];
    const streaks = computeStreaks(trades);
    expect(streaks.longestWin).toBe(3);
    expect(streaks.longestLoss).toBe(1);
    expect(streaks.currentType).toBe("Win");
    expect(streaks.currentCount).toBe(3);
  });

  it("reports days since the last loss based on the most recent Loss trade", () => {
    const trades = [
      trade({ status: "Loss", date: "2026-07-01" }),
      trade({ status: "Win", date: "2026-07-05" }),
    ];
    const streaks = computeStreaks(trades);
    expect(streaks.daysSinceLastLoss).not.toBeNull();
  });

  it("returns null for daysSinceLastLoss when there are no losses at all", () => {
    const trades = [trade({ status: "Win" })];
    expect(computeStreaks(trades).daysSinceLastLoss).toBeNull();
  });
});

describe("computeChallengeStats", () => {
  const baseChallenge = {
    id: "c1",
    accountSize: 100000,
    profitTargetPct: 10,
    maxTotalLossPct: 10,
    maxDailyLossPct: 5,
    minTradingDays: 2,
    startDate: "2026-07-01",
    stage: "evaluation",
  };

  it("marks a challenge as Passed once the target is reached with enough trading days", () => {
    const trades = [
      trade({ challengeId: "c1", pnl: 6000, fees: 0, date: "2026-07-02" }),
      trade({ challengeId: "c1", pnl: 5000, fees: 0, date: "2026-07-03" }),
    ];
    const stats = computeChallengeStats(baseChallenge, trades);
    expect(stats.netPnl).toBe(11000);
    expect(stats.currentBalance).toBe(111000);
    expect(stats.targetReached).toBe(true);
    expect(stats.minDaysMet).toBe(true);
    expect(stats.status).toBe("Passed");
  });

  it("marks a challenge as Failed once the max total loss is breached", () => {
    const trades = [trade({ challengeId: "c1", pnl: -11000, fees: 0, date: "2026-07-02" })];
    const stats = computeChallengeStats(baseChallenge, trades);
    expect(stats.totalLossBreached).toBe(true);
    expect(stats.status).toBe("Failed");
  });

  it("marks a challenge as Failed once a single day's loss breaches the daily limit", () => {
    // maxDailyLossPct=5 on a 100k account -> $5,000 daily limit
    const trades = [trade({ challengeId: "c1", pnl: -6000, fees: 0, date: "2026-07-02" })];
    const stats = computeChallengeStats(baseChallenge, trades);
    expect(stats.dailyLossBreached).toBe(true);
    expect(stats.status).toBe("Failed");
  });

  it("computes payout as the profit split of net gains since the last payout, for funded accounts", () => {
    const funded = { ...baseChallenge, stage: "funded", profitSplitPct: 80, lastPayoutNetProfit: 1000 };
    const trades = [trade({ challengeId: "c1", pnl: 5000, fees: 0, date: "2026-07-02" })];
    const stats = computeChallengeStats(funded, trades);
    // netPnl=5000, availableForPayout = 5000-1000=4000, payout = 4000*0.8=3200
    expect(stats.availableForPayout).toBe(4000);
    expect(stats.payoutAmount).toBe(3200);
    expect(stats.status).toBe("Funded");
  });

  it("ignores trades that belong to a different challenge", () => {
    const trades = [
      trade({ challengeId: "c1", pnl: 1000, date: "2026-07-02" }),
      trade({ challengeId: "other-challenge", pnl: 999999, date: "2026-07-02" }),
    ];
    const stats = computeChallengeStats(baseChallenge, trades);
    expect(stats.netPnl).toBe(1000);
  });
});

describe("computePaceProjection", () => {
  it("returns null once the target has already been reached", () => {
    expect(computePaceProjection({ targetReached: true })).toBeNull();
  });

  it("returns null once the account has breached a loss rule", () => {
    expect(computePaceProjection({ totalLossBreached: true })).toBeNull();
    expect(computePaceProjection({ dailyLossBreached: true })).toBeNull();
  });

  it("returns a projected day count for a positive average daily pace", () => {
    const stats = {
      targetReached: false, totalLossBreached: false, dailyLossBreached: false,
      tradingDaysCount: 4, netPnl: 4000, targetBalance: 110000, currentBalance: 104000,
    };
    const projection = computePaceProjection(stats);
    expect(projection.avgDailyPnl).toBe(1000);
    // remaining = 110000-104000 = 6000, at 1000/day -> 6 days
    expect(projection.projectedDays).toBe(6);
    expect(projection.projectedDate).toBeInstanceOf(Date);
  });

  it("returns projectedDays: null when the average daily pace is flat or negative", () => {
    const stats = {
      targetReached: false, totalLossBreached: false, dailyLossBreached: false,
      tradingDaysCount: 3, netPnl: -500, targetBalance: 110000, currentBalance: 99500,
    };
    expect(computePaceProjection(stats)).toEqual({ avgDailyPnl: expect.any(Number), projectedDays: null });
  });
});

describe("equityCurve", () => {
  it("returns a running cumulative equity total, sorted chronologically regardless of input order", () => {
    const trades = [
      trade({ date: "2026-07-03", pnl: 50, fees: 0 }),
      trade({ date: "2026-07-01", pnl: 100, fees: 10 }),
      trade({ date: "2026-07-02", pnl: -30, fees: 0 }),
    ];
    const curve = equityCurve(trades);
    expect(curve.map((p) => p.equity)).toEqual([90, 60, 110]);
  });

  it("returns an empty array for no trades", () => {
    expect(equityCurve([])).toEqual([]);
  });
});
