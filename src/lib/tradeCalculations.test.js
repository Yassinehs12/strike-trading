import { describe, it, expect } from "vitest";
import {
  computeKPIs,
  computeStreaks,
  computeChallengeStats,
  computePaceProjection,
  equityCurve,
  computeDrawdownRecovery,
  computeSetupPerformance,
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

describe("computeDrawdownRecovery", () => {
  it("reports a new high with 100% recovery when there are no trades", () => {
    const r = computeDrawdownRecovery([]);
    expect(r.atNewHigh).toBe(true);
    expect(r.recoveryPct).toBe(100);
  });

  it("reports a new high when equity only ever went up", () => {
    const trades = [
      trade({ pnl: 100, date: "2026-07-01" }),
      trade({ pnl: 50, date: "2026-07-02" }),
    ];
    const r = computeDrawdownRecovery(trades);
    expect(r.atNewHigh).toBe(true);
    expect(r.current).toBe(150);
    expect(r.peak).toBe(150);
    expect(r.drawdownPct).toBe(0);
  });

  it("computes partial recovery progress between the trough and the prior peak", () => {
    // Equity path: +1000 (peak) -> -500 (trough, equity=500) -> +250 (equity=750)
    // Drawdown range = 1000-500 = 500. Recovered = 750-500 = 250. -> 50%.
    const trades = [
      trade({ pnl: 1000, date: "2026-07-01" }),
      trade({ pnl: -500, date: "2026-07-02", status: "Loss" }),
      trade({ pnl: 250, date: "2026-07-03" }),
    ];
    const r = computeDrawdownRecovery(trades);
    expect(r.atNewHigh).toBe(false);
    expect(r.peak).toBe(1000);
    expect(r.troughSincePeak).toBe(500);
    expect(r.recoveryPct).toBe(50);
  });

  it("reports 0% recovery right at the trough itself", () => {
    const trades = [
      trade({ pnl: 1000, date: "2026-07-01" }),
      trade({ pnl: -500, date: "2026-07-02", status: "Loss" }),
    ];
    const r = computeDrawdownRecovery(trades);
    expect(r.recoveryPct).toBe(0);
  });

  it("resets the trough tracker once a new equity high is reached", () => {
    const trades = [
      trade({ pnl: 1000, date: "2026-07-01" }),
      trade({ pnl: -800, date: "2026-07-02", status: "Loss" }), // deep drawdown, equity=200
      trade({ pnl: 900, date: "2026-07-03" }), // new high, equity=1100 -> trough resets
      trade({ pnl: -100, date: "2026-07-04", status: "Loss" }), // equity=1000
    ];
    const r = computeDrawdownRecovery(trades);
    // Trough should track the small dip from the NEW peak (1100), not the old deep one.
    expect(r.peak).toBe(1100);
    expect(r.troughSincePeak).toBe(1000);
  });
});

describe("computeSetupPerformance", () => {
  it("groups trades by setup and computes win rate and net P&L per group", () => {
    const trades = [
      trade({ setup: "Breakout", status: "Win", pnl: 100 }),
      trade({ setup: "Breakout", status: "Win", pnl: 100 }),
      trade({ setup: "Breakout", status: "Loss", pnl: -50 }),
      trade({ setup: "Reversal", status: "Loss", pnl: -30 }),
    ];
    const result = computeSetupPerformance(trades);
    const breakout = result.find((r) => r.setup === "Breakout");
    expect(breakout.count).toBe(3);
    expect(breakout.winRate).toBeCloseTo((2 / 3) * 100);
    expect(breakout.netPnl).toBe(150);
  });

  it("sorts groups by net P&L descending", () => {
    const trades = [
      trade({ setup: "A", status: "Loss", pnl: -100 }),
      trade({ setup: "B", status: "Win", pnl: 200 }),
    ];
    const result = computeSetupPerformance(trades);
    expect(result[0].setup).toBe("B");
    expect(result[1].setup).toBe("A");
  });

  it("excludes open/pending trades from the grouping", () => {
    const trades = [trade({ setup: "A", status: "Open" }), trade({ setup: "A", status: "Win", pnl: 50 })];
    const result = computeSetupPerformance(trades);
    expect(result[0].count).toBe(1);
  });

  it("labels trades with no setup tag as 'Untagged' rather than dropping them", () => {
    const result = computeSetupPerformance([trade({ setup: "", status: "Win", pnl: 10 })]);
    expect(result[0].setup).toBe("Untagged");
  });

  it("only computes avg R from trades that actually have a risk amount logged", () => {
    const trades = [
      trade({ setup: "A", status: "Win", pnl: 200, riskAmount: 100 }), // 2R
      trade({ setup: "A", status: "Win", pnl: 50, riskAmount: null }), // no risk logged
    ];
    const result = computeSetupPerformance(trades);
    expect(result[0].avgR).toBe(2);
  });

  it("returns null avgR for a setup where no trade has a risk amount logged", () => {
    const result = computeSetupPerformance([trade({ setup: "A", status: "Win", pnl: 50 })]);
    expect(result[0].avgR).toBeNull();
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
