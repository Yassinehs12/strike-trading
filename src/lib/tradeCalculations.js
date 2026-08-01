import React from "react";
import { TODAY } from "../lib/mockData";
import { clamp, daysAgo } from "../lib/format";

export function computeKPIs(trades) {
  const total = trades.length;
  const wins = trades.filter((t) => t.status === "Win");
  const losses = trades.filter((t) => t.status === "Loss");
  const netProfit = trades.reduce((s, t) => s + t.pnl - t.fees, 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const winRate = total ? (wins.length / total) * 100 : 0;
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const avgRR = avgLoss ? avgWin / avgLoss : 0;
  return { total, netProfit, winRate, profitFactor, avgRR };
}


export function computeStreaks(trades) {
  const sorted = [...trades].filter((t) => t.status !== "BE").sort((a, b) => new Date(a.date) - new Date(b.date));
  let currentType = null, currentCount = 0;
  let longestWin = 0, longestLoss = 0, run = 0, runType = null;
  sorted.forEach((t) => {
    if (t.status === runType) run += 1; else { runType = t.status; run = 1; }
    if (runType === "Win") longestWin = Math.max(longestWin, run);
    if (runType === "Loss") longestLoss = Math.max(longestLoss, run);
  });
  for (let i = sorted.length - 1; i >= 0; i--) {
    const t = sorted[i];
    if (currentType === null) { currentType = t.status; currentCount = 1; }
    else if (t.status === currentType) currentCount += 1;
    else break;
  }
  const holdTimes = trades.map((t) => t.holdingMinutes).filter(Boolean);
  const avgHold = holdTimes.length ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length : 0;
  const lastLoss = [...trades].filter((t) => t.status === "Loss").sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const daysSinceLastLoss = lastLoss ? daysAgo(lastLoss.date) : null;
  return { currentType, currentCount, longestWin, longestLoss, avgHold, daysSinceLastLoss };
}


export function computeChallengeStats(challenge, allTrades) {
  const trades = allTrades.filter((t) => t.challengeId === challenge.id);
  const netPnl = trades.reduce((s, t) => s + t.pnl - t.fees, 0);
  const currentBalance = challenge.accountSize + netPnl;

  const targetBalance = challenge.accountSize * (1 + challenge.profitTargetPct / 100);
  const progressToTarget = clamp(((currentBalance - challenge.accountSize) / (targetBalance - challenge.accountSize)) * 100, 0, 100);
  const targetReached = currentBalance >= targetBalance;

  const floorBalance = challenge.accountSize * (1 - challenge.maxTotalLossPct / 100);
  const totalDrawdownUsed = clamp(((challenge.accountSize - currentBalance) / (challenge.accountSize - floorBalance)) * 100, 0, 100);
  const totalLossBreached = currentBalance <= floorBalance;

  const byDay = {};
  trades.forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + (t.pnl - t.fees); });
  const worstDay = Math.min(0, ...Object.values(byDay), 0);
  const dailyLossLimit = challenge.accountSize * (challenge.maxDailyLossPct / 100);
  const dailyLossUsed = clamp((Math.abs(worstDay) / dailyLossLimit) * 100, 0, 999);
  const dailyLossBreached = Math.abs(worstDay) >= dailyLossLimit;

  const tradingDaysCount = Object.keys(byDay).length;
  const minDaysMet = tradingDaysCount >= challenge.minTradingDays;

  const daysActive = Math.floor((TODAY - new Date(challenge.startDate)) / 86400000);

  let status = "In Progress";
  if (totalLossBreached || dailyLossBreached) status = "Failed";
  else if (challenge.stage === "funded") status = "Funded";
  else if (targetReached && minDaysMet) status = "Passed";

  const availableForPayout = challenge.stage === "funded"
    ? Math.max(0, netPnl - (challenge.lastPayoutNetProfit || 0))
    : 0;
  const payoutAmount = availableForPayout * ((challenge.profitSplitPct || 80) / 100);

  return {
    currentBalance, targetBalance, progressToTarget, targetReached,
    floorBalance, totalDrawdownUsed, totalLossBreached,
    dailyLossLimit, dailyLossUsed: clamp(dailyLossUsed, 0, 100), dailyLossBreached, worstDay,
    tradingDaysCount, minDaysMet, daysActive, status, netPnl,
    availableForPayout, payoutAmount,
  };
}

/* ---------- prop-firm rule presets (approximate — firms adjust rules over time,
   always confirm against the firm's current terms before relying on these).
   Firm lists sourced from propfirmmatch.com's Futures and CFD/Forex rankings,
   split by market so the picker below can group them. ---------- */


export const PROP_FIRM_PRESETS = {
  // ---- Futures firms ----
  topstep: {
    label: "Topstep", market: "futures",
    phases: {
      "Phase 1": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 2 },
      "Phase 2": { profitTargetPct: 4, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 2 },
      "Live": { maxDailyLossPct: 100, maxTotalLossPct: 4, profitSplitPct: 90 },
    },
  },
  apex: {
    label: "Apex Trader Funding", market: "futures",
    phases: {
      "Phase 1": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 5, minTradingDays: 7 },
      "Phase 2": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 5, minTradingDays: 7 },
      "Live": { maxDailyLossPct: 100, maxTotalLossPct: 5, profitSplitPct: 90 },
    },
  },
  myFundedFutures: {
    label: "My Funded Futures", market: "futures",
    phases: {
      "Phase 1": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Phase 2": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Live": { maxDailyLossPct: 100, maxTotalLossPct: 4, profitSplitPct: 90 },
    },
  },
  tradeify: {
    label: "Tradeify", market: "futures",
    phases: {
      "Phase 1": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Phase 2": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Live": { maxDailyLossPct: 100, maxTotalLossPct: 4, profitSplitPct: 90 },
    },
  },
  lucidTrading: {
    label: "Lucid Trading", market: "futures",
    phases: {
      "Phase 1": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Phase 2": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Live": { maxDailyLossPct: 100, maxTotalLossPct: 4, profitSplitPct: 90 },
    },
  },
  alphaFutures: {
    label: "Alpha Futures", market: "futures",
    phases: {
      "Phase 1": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Phase 2": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Live": { maxDailyLossPct: 100, maxTotalLossPct: 4, profitSplitPct: 90 },
    },
  },
  takeProfitTrader: {
    label: "Take Profit Trader", market: "futures",
    phases: {
      "Phase 1": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Phase 2": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Live": { maxDailyLossPct: 100, maxTotalLossPct: 4, profitSplitPct: 90 },
    },
  },
  fundedFuturesFamily: {
    label: "Funded Futures Family", market: "futures",
    phases: {
      "Phase 1": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Phase 2": { profitTargetPct: 6, maxDailyLossPct: 100, maxTotalLossPct: 4, minTradingDays: 5 },
      "Live": { maxDailyLossPct: 100, maxTotalLossPct: 4, profitSplitPct: 90 },
    },
  },
  // ---- CFD / Forex firms ----
  ftmo: {
    label: "FTMO", market: "cfd",
    phases: {
      "Phase 1": { profitTargetPct: 10, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 4 },
      "Phase 2": { profitTargetPct: 5, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 4 },
      "Live": { maxDailyLossPct: 5, maxTotalLossPct: 10, profitSplitPct: 80 },
    },
  },
  fundedNext: {
    label: "FundedNext", market: "cfd",
    phases: {
      "Phase 1": { profitTargetPct: 10, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 5 },
      "Phase 2": { profitTargetPct: 5, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 5 },
      "Live": { maxDailyLossPct: 5, maxTotalLossPct: 10, profitSplitPct: 80 },
    },
  },
  fundingPips: {
    label: "FundingPips", market: "cfd",
    phases: {
      "Phase 1": { profitTargetPct: 8, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Phase 2": { profitTargetPct: 5, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Live": { maxDailyLossPct: 5, maxTotalLossPct: 10, profitSplitPct: 80 },
    },
  },
  the5ers: {
    label: "The5%ers", market: "cfd",
    phases: {
      "Phase 1": { profitTargetPct: 8, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Phase 2": { profitTargetPct: 5, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Live": { maxDailyLossPct: 5, maxTotalLossPct: 10, profitSplitPct: 80 },
    },
  },
  tradeThePool: {
    label: "Trade The Pool", market: "cfd",
    phases: {
      "Phase 1": { profitTargetPct: 8, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Phase 2": { profitTargetPct: 5, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Live": { maxDailyLossPct: 5, maxTotalLossPct: 10, profitSplitPct: 80 },
    },
  },
  goatFundedTrader: {
    label: "Goat Funded Trader", market: "cfd",
    phases: {
      "Phase 1": { profitTargetPct: 8, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Phase 2": { profitTargetPct: 5, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Live": { maxDailyLossPct: 5, maxTotalLossPct: 10, profitSplitPct: 80 },
    },
  },
  e8Markets: {
    label: "E8 Markets", market: "cfd",
    phases: {
      "Phase 1": { profitTargetPct: 8, maxDailyLossPct: 5, maxTotalLossPct: 8, minTradingDays: 3 },
      "Phase 2": { profitTargetPct: 5, maxDailyLossPct: 5, maxTotalLossPct: 8, minTradingDays: 3 },
      "Live": { maxDailyLossPct: 5, maxTotalLossPct: 8, profitSplitPct: 80 },
    },
  },
  holaPrime: {
    label: "Hola Prime", market: "cfd",
    phases: {
      "Phase 1": { profitTargetPct: 8, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Phase 2": { profitTargetPct: 5, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Live": { maxDailyLossPct: 5, maxTotalLossPct: 10, profitSplitPct: 80 },
    },
  },
  alphaCapital: {
    label: "Alpha Capital Group", market: "cfd",
    phases: {
      "Phase 1": { profitTargetPct: 8, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Phase 2": { profitTargetPct: 5, maxDailyLossPct: 5, maxTotalLossPct: 10, minTradingDays: 3 },
      "Live": { maxDailyLossPct: 5, maxTotalLossPct: 10, profitSplitPct: 80 },
    },
  },
  mff: {
    label: "MyFundedFX (MFF)", market: "cfd",
    phases: {
      "Phase 1": { profitTargetPct: 8, maxDailyLossPct: 5, maxTotalLossPct: 12, minTradingDays: 1 },
      "Phase 2": { profitTargetPct: 5, maxDailyLossPct: 5, maxTotalLossPct: 12, minTradingDays: 1 },
      "Live": { maxDailyLossPct: 5, maxTotalLossPct: 12, profitSplitPct: 85 },
    },
  },
};

// Projects, at the account's current average daily pace, roughly how many trading
// days out the profit target is. Returns null when there's not enough signal yet
// (no trades, flat/negative pace, target already reached, or the account failed).


export function computePaceProjection(stats) {
  if (!stats || stats.targetReached || stats.totalLossBreached || stats.dailyLossBreached) return null;
  const daysCounted = Math.max(stats.tradingDaysCount, 1);
  const avgDailyPnl = stats.netPnl / daysCounted;
  if (avgDailyPnl <= 0 || stats.tradingDaysCount === 0) return { avgDailyPnl, projectedDays: null };
  const remaining = stats.targetBalance - stats.currentBalance;
  const projectedDays = Math.max(1, Math.ceil(remaining / avgDailyPnl));
  const projectedDate = new Date(TODAY.getTime() + projectedDays * 86400000);
  return { avgDailyPnl, projectedDays, projectedDate };
}


export const equityCurve = (trades) => {
  const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  return sorted.map((t) => { running += t.pnl - t.fees; return { date: t.date.slice(5), equity: +running.toFixed(2) }; });
};
