import React from "react";
import { ASSETS, SESSIONS, SETUPS } from "../constants";

export const TODAY = new Date("2026-07-10");


export function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}


export const rand = seededRandom(42);


export function genTrades() {
  const trades = [];
  let id = 1;
  for (let i = 60; i >= 0; i--) {
    if (rand() > 0.55) continue;
    const date = new Date(TODAY);
    date.setDate(date.getDate() - i);
    const asset = ASSETS[Math.floor(rand() * ASSETS.length)];
    const direction = rand() > 0.5 ? "Long" : "Short";
    const setup = SETUPS[Math.floor(rand() * SETUPS.length)];
    const session = SESSIONS[Math.floor(rand() * SESSIONS.length)];
    const outcomeRoll = rand();
    const status = outcomeRoll > 0.62 ? "Win" : outcomeRoll > 0.14 ? "Loss" : "BE";
    const entry = +(1 + rand() * 2000).toFixed(asset.includes("USD") && !asset.includes("BTC") && !asset.includes("ETH") ? 4 : 2);
    const riskUnit = entry * 0.004 * (1 + rand());
    let pnl = 0;
    if (status === "Win") pnl = +(riskUnit * (1 + rand() * 2.5) * 100).toFixed(2);
    else if (status === "Loss") pnl = -+(riskUnit * (0.6 + rand() * 0.8) * 100).toFixed(2);
    else pnl = +(rand() * 6 - 3).toFixed(2);
    const fees = +(2 + rand() * 6).toFixed(2);
    const lots = +(0.1 + rand() * 2).toFixed(2);
    const exit = direction === "Long"
      ? +(entry + (pnl > 0 ? 1 : -1) * (Math.abs(pnl) / (lots * 1000))).toFixed(4)
      : +(entry - (pnl > 0 ? 1 : -1) * (Math.abs(pnl) / (lots * 1000))).toFixed(4);
    const roll = rand();
    const challengeId = roll > 0.55 ? 1 : roll > 0.3 ? 2 : null;
    // Losing trades skip a checklist step more often — gives the discipline
    // score/finding something real to point at in the demo data.
    const skipChance = status === "Loss" ? 0.45 : 0.12;
    const checklist = {
      setupConfirmed: rand() > skipChance,
      riskSized: rand() > skipChance,
      newsChecked: rand() > skipChance,
    };

    trades.push({
      id: id++,
      date: date.toISOString().slice(0, 10),
      asset, direction, entry, exit, lots, fees, setup, session, status, pnl,
      holdingMinutes: Math.floor(5 + rand() * 240),
      challengeId,
      checklist,
      screenshot: null,
      notes:
        status === "Win"
          ? "Followed plan, patient entry, took profit at target."
          : status === "Loss"
          ? "Entered early, ignored confluence, revenge-trade risk."
          : "Scratched trade, conditions changed post-entry.",
    });
  }
  return trades;
}


export function genFundedTrades() {
  const trades = [];
  let id = 9000;
  for (let i = 45; i >= 0; i--) {
    if (rand() > 0.5) continue;
    const date = new Date(TODAY);
    date.setDate(date.getDate() - i);
    const asset = ASSETS[Math.floor(rand() * ASSETS.length)];
    const direction = rand() > 0.5 ? "Long" : "Short";
    const setup = SETUPS[Math.floor(rand() * SETUPS.length)];
    const session = SESSIONS[Math.floor(rand() * SESSIONS.length)];
    const win = rand() > 0.32;
    const status = win ? "Win" : rand() > 0.6 ? "Loss" : "BE";
    const entry = +(1 + rand() * 2000).toFixed(2);
    const base = 60 + rand() * 340;
    const pnl = status === "Win" ? +base.toFixed(2) : status === "Loss" ? -+(base * 0.5).toFixed(2) : +(rand() * 4 - 2).toFixed(2);
    const fees = +(2 + rand() * 5).toFixed(2);
    const lots = +(0.2 + rand() * 1.5).toFixed(2);
    const exit = direction === "Long" ? +(entry + (pnl > 0 ? 1 : -1) * 2).toFixed(4) : +(entry - (pnl > 0 ? 1 : -1) * 2).toFixed(4);
    trades.push({
      id: id++, date: date.toISOString().slice(0, 10), asset, direction, entry, exit, lots, fees,
      setup, session, status, pnl, holdingMinutes: Math.floor(10 + rand() * 200),
      challengeId: 3, screenshot: null,
      notes: status === "Win" ? "Clean execution on the funded account, sized appropriately." : "Minor slippage, still within plan.",
    });
  }
  return trades;
}


export const MOCK_TRADES = [...genTrades(), ...genFundedTrades()].sort((a, b) => new Date(b.date) - new Date(a.date));


export const MOCK_CHALLENGES = [
  {
    id: 1, firm: "FTMO", phase: "Phase 1", stage: "evaluation",
    accountSize: 100000, profitTargetPct: 10, maxDailyLossPct: 5, maxTotalLossPct: 10,
    durationDays: 30, minTradingDays: 10, startDate: "2026-06-10",
  },
  {
    id: 2, firm: "Alpha Capital", phase: "Verification", stage: "evaluation",
    accountSize: 50000, profitTargetPct: 5, maxDailyLossPct: 4, maxTotalLossPct: 8,
    durationDays: 60, minTradingDays: 10, startDate: "2026-05-15",
  },
  {
    id: 3, firm: "The 5%ers", phase: "Funded", stage: "funded",
    accountSize: 50000, profitTargetPct: 8, maxDailyLossPct: 5, maxTotalLossPct: 10,
    durationDays: 999, minTradingDays: 10, startDate: "2026-05-01",
    profitSplitPct: 80, lastPayoutNetProfit: 1550,
    payoutHistory: [
      { date: "2026-06-15", amount: 1240, split: 80 },
    ],
  },
];

/* ============================================================
   HELPERS
   ============================================================ */
