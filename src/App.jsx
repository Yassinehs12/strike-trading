import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  LayoutDashboard, ShieldCheck, BookOpen, BarChart3, Plus, X, Search,
  TrendingUp, Percent, Target, Activity, CheckCircle2,
  XCircle, AlertTriangle, ChevronLeft, ChevronRight, Filter,
  Wallet, Flame, Menu, ArrowUpRight, ArrowDownRight, Trash2, Gauge,
  Table2, LayoutGrid, Download, Settings as SettingsIcon, Banknote,
  Award, Clock, CalendarDays, CalendarClock, Loader2, Upload, Image as ImageIcon, Folder, Grid3x3, FileText, Sparkles,
  ArrowUpDown, CheckCircle, Info, Pencil, Mail, Lock, LogOut, Eye, EyeOff, MessagesSquare, UserCircle, Bell, Check, ShieldAlert, Ban, Trophy, Star, BookMarked, Copy, Shield, KeyRound, Palette, BellRing, Calculator,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { fetchTrades, fetchChallenges, insertTrade, updateTradeDB, deleteTradeDB, insertChallenge, updateChallengeDB, deleteChallengeDB, fetchProfile, createProfile, updateProfileUsername, fetchPendingFriendRequests, subscribeToFriendRequests, acceptFriendRequest, fetchNotifications, markNotificationRead, subscribeToNotifications, setLeaderboardOptIn, submitTradeSpotlight, applyReferralCode } from "./db";
import { badgeFromKey } from "./Badges";
import { computeInsights, filterTradesByPeriod } from "./insights";
import LandingPage from "./LandingPage";
import { PrivacyPolicy, TermsOfService } from "./LegalPages";
import ChangelogPage from "./ChangelogPage";
import CalculatorPage from "./CalculatorPage";
import ForumPage from "./ForumPage";
import ProfilePage from "./ProfilePage";
import MessagesPage from "./MessagesPage";
import AdminPanel from "./AdminPanel";
import AdminBadge from "./AdminBadge";
import LeaderboardPage from "./LeaderboardPage";
import GoalsPage from "./GoalsPage";
import JournalingPage from "./JournalingPage";
import UserProfileModal from "./UserProfileModal";
import { LogoFull } from "./Logo";
import ThemeToggle from "./ThemeToggle.jsx";

/* ============================================================
   FONTS + BASE STYLE
   ============================================================ */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    .tj-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    .tj-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .tj-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
    .tj-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .tj-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
    @keyframes tj-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes tj-slide-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes tj-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    .tj-animate-in { animation: tj-fade-in 0.28s ease-out; }
    .tj-slide-in { animation: tj-slide-in 0.22s ease-out; }
    .tj-skeleton { animation: tj-pulse 1.4s ease-in-out infinite; }
  `}</style>
);

/* ============================================================
   MOCK DATA  (structured to map 1:1 onto future DB tables)
   ============================================================ */
const ASSETS = ["EURUSD", "GBPUSD", "XAUUSD", "BTCUSD", "ETHUSD", "NVDA", "US30", "NAS100"];
const SETUPS = ["Breakout", "FVG", "Trend Following", "Reversal", "Liquidity Grab", "Range"];
const SESSIONS = ["London", "New York", "Asia"];
const EMOTIONS = ["Neutral", "Greed", "FOMO", "Overtrading", "Fear"];
const SETUP_GRADES = ["A+", "A", "B"];
const TODAY = new Date("2026-07-10");
const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rand = seededRandom(42);

function genTrades() {
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

    trades.push({
      id: id++,
      date: date.toISOString().slice(0, 10),
      asset, direction, entry, exit, lots, fees, setup, session, status, pnl,
      holdingMinutes: Math.floor(5 + rand() * 240),
      challengeId,
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

function genFundedTrades() {
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

const MOCK_TRADES = [...genTrades(), ...genFundedTrades()].sort((a, b) => new Date(b.date) - new Date(a.date));

const MOCK_CHALLENGES = [
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
const fmtUSD = (n, opts = {}) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, ...opts });
const fmtUSD2 = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const daysAgo = (dateStr) => Math.floor((TODAY - new Date(dateStr)) / 86400000);

function computeKPIs(trades) {
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

function computeStreaks(trades) {
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

function computeChallengeStats(challenge, allTrades) {
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

function downloadBlob(content, filename, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function tradesToCSV(trades) {
  const headers = ["Date", "Asset", "Direction", "Entry", "Exit", "Lots", "Fees", "Setup", "Session", "Status", "PnL", "Notes"];
  const rows = trades.map((t) => [t.date, t.asset, t.direction, t.entry, t.exit, t.lots, t.fees, t.setup, t.session, t.status, t.pnl, `"${(t.notes || "").replace(/"/g, "'")}"`]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

async function tradesToPDF(trades, meta = {}) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text("Strike Journal — Trade Journal Export", 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${meta.username || ""}  ·  Exported ${new Date().toLocaleString()}  ·  ${trades.length} trades`, 14, 22);

  const wins = trades.filter((t) => t.status === "Win").length;
  const losses = trades.filter((t) => t.status === "Loss").length;
  const netPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  doc.text(`Win rate: ${trades.length ? Math.round((wins / trades.length) * 100) : 0}%  ·  Wins: ${wins}  ·  Losses: ${losses}  ·  Net PnL: ${netPnl.toFixed(2)}`, 14, 27);

  autoTable(doc, {
    startY: 33,
    head: [["Date", "Asset", "Dir", "Entry", "Exit", "Lots", "Fees", "Setup", "Session", "Status", "PnL", "Notes"]],
    body: trades.map((t) => [
      t.date, t.asset, t.direction, t.entry, t.exit, t.lots, t.fees, t.setup || "", t.session || "", t.status,
      Number(t.pnl).toFixed(2), (t.notes || "").slice(0, 60),
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 30, 33] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 10) {
        const val = Number(trades[data.row.index]?.pnl);
        if (val > 0) data.cell.styles.textColor = [16, 150, 90];
        else if (val < 0) data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  doc.save("trade_journal_export.pdf");
}

// Parses a CSV export (from this app, or MT4/MT5/prop-firm exports using the
// same header names) back into trade objects ready for insertTrade().
// This is a manual-import "broker sync" — no live API connection to a broker.
function csvToTrades(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { trades: [], errors: ["File has no data rows."] };

  const splitRow = (line) => {
    const cells = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === "," && !inQuotes) { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };

  const headerMap = { date: "date", asset: "asset", symbol: "asset", direction: "direction", type: "direction",
    entry: "entry", "entry price": "entry", exit: "exit", "exit price": "exit", lots: "lots", size: "lots",
    fees: "fees", commission: "fees", setup: "setup", session: "session", status: "status", outcome: "status",
    pnl: "pnl", profit: "pnl", notes: "notes", comment: "notes" };

  const headers = splitRow(lines[0]).map((h) => headerMap[h.toLowerCase()] || null);
  const trades = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitRow(lines[i]);
    const row = {};
    headers.forEach((key, idx) => { if (key) row[key] = cells[idx]; });

    if (!row.date || !row.asset || row.entry == null || row.exit == null) {
      errors.push(`Row ${i + 1}: missing required fields (date, asset, entry, exit) — skipped.`);
      continue;
    }

    trades.push({
      date: row.date,
      asset: row.asset,
      direction: /short|sell/i.test(row.direction || "") ? "Short" : "Long",
      entry: Number(row.entry) || 0,
      exit: Number(row.exit) || 0,
      lots: Number(row.lots) || 0,
      fees: Number(row.fees) || 0,
      setup: row.setup || "Imported",
      session: row.session || "",
      status: row.status || (Number(row.pnl) > 0 ? "Win" : Number(row.pnl) < 0 ? "Loss" : "BE"),
      pnl: Number(row.pnl) || 0,
      holdingMinutes: 0,
      challengeId: null,
      screenshot: null,
      notes: row.notes || "",
    });
  }

  return { trades, errors };
}

/* ============================================================
   TOASTS
   ============================================================ */
const ToastContext = React.createContext(() => {});
const useToast = () => React.useContext(ToastContext);

const ToastContainer = ({ toasts }) => (
  <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-[calc(100%-2rem)] sm:w-auto">
    {toasts.map((t) => (
      <div key={t.id} className={`tj-slide-in flex items-center gap-2 px-4 py-3 rounded-lg border shadow-xl text-sm font-medium sm:min-w-[280px]
        ${t.type === "error" ? "bg-rose-950 border-rose-800 text-rose-200" : t.type === "info" ? "bg-[var(--bg-secondary)] border-[var(--border-secondary)] text-[var(--text-primary)]" : "bg-emerald-950 border-emerald-800 text-emerald-200"}`}>
        {t.type === "error" ? <XCircle size={16} /> : t.type === "info" ? <Info size={16} /> : <CheckCircle size={16} />}
        {t.message}
      </div>
    ))}
  </div>
);

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
const Card = ({ className = "", children }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`}>{children}</div>
);

const SectionHeader = ({ title, subtitle, icon, noMargin }) => (
  <div className={noMargin ? "" : "mb-4"}>
    <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
      {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
      {title}
    </h3>
    {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{subtitle}</p>}
  </div>
);

const EmptyState = ({ icon: Icon, title, sub, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-4">
    <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
      <Icon size={20} className="text-[var(--text-muted)]" />
    </div>
    <p className="text-sm font-semibold text-[var(--text-secondary)]">{title}</p>
    {sub && <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">{sub}</p>}
    {action}
  </div>
);

const Skeleton = ({ className = "" }) => <div className={`tj-skeleton bg-[var(--bg-tertiary)] rounded-lg ${className}`} />;

const LoadingScreen = () => (
  <div className="p-4 md:p-6 space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
    </div>
    <Skeleton className="h-64" />
    <Skeleton className="h-48" />
  </div>
);

const StatusPill = ({ status }) => {
  const map = {
    Win: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    Loss: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    BE: "bg-[var(--text-muted)]/10 text-[var(--text-tertiary)] border-[var(--text-muted)]/30",
    Passed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    Funded: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    Failed: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    "In Progress": "bg-sky-500/10 text-sky-400 border-sky-500/30",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || map.BE}`}>{status}</span>;
};

const GaugeBar = ({ label, usedPct, breached, rightLabel, danger = true }) => {
  const barColor = breached ? "bg-rose-500" : usedPct > 75 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1"><Gauge size={12} className="text-[var(--text-muted)]" /> {label}</span>
        <span className={`tj-mono text-xs font-semibold ${breached ? "text-rose-400" : "text-[var(--text-secondary)]"}`}>{rightLabel}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        {danger && <div className="absolute right-0 top-0 h-full w-1/5 bg-rose-500/20" />}
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${clamp(usedPct, 2, 100)}%` }} />
        <div className="absolute inset-0 flex justify-between px-[1px]">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="w-px h-full bg-[var(--bg-primary)]/40" />)}
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ pct, color = "bg-[var(--accent)]" }) => (
  <div className="h-2 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
    <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${clamp(pct, 1, 100)}%` }} />
  </div>
);

const KPICard = ({ icon: Icon, label, value, sub, accent = "text-[var(--text-primary)]" }) => (
  <Card className="p-4 tj-animate-in">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center"><Icon size={14} className="text-[var(--accent)]" /></div>
    </div>
    <div className={`tj-mono text-2xl font-bold ${accent}`}>{value}</div>
    {sub && <div className="text-xs text-[var(--text-muted)] mt-1">{sub}</div>}
  </Card>
);

/* ============================================================
   NAVIGATION
   ============================================================ */
const NAV_GROUPS = [
  {
    label: "Trading",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "challenges", label: "Challenges", icon: ShieldCheck },
      { id: "journal", label: "Trade Journal", icon: BookOpen },
      { id: "journaling", label: "Weekly/Monthly Review", icon: BookMarked },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "goals", label: "Goals", icon: Target },
      { id: "econ-calendar", label: "Economic Calendar", icon: CalendarClock },
      { id: "heatmaps", label: "Market Heatmaps", icon: Grid3x3 },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "calculator", label: "Pips Calculator", icon: Calculator },
    ],
  },
  {
    label: "Community",
    items: [
      { id: "forum", label: "Community", icon: MessagesSquare },
      { id: "leaderboard", label: "Leaderboard", icon: Trophy },
      { id: "messages", label: "Messages", icon: Mail },
    ],
  },
  {
    label: null,
    items: [
      { id: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

const ADMIN_NAV_ITEM = { id: "admin", label: "Admin Panel", icon: ShieldAlert };

// Every tab the app can be on, used to keep the URL in sync so a refresh
// stays on the current page instead of bouncing back to the dashboard.
const VALID_TAB_IDS = [
  ...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
  ADMIN_NAV_ITEM.id,
  "profile",
];

// Reads the tab out of the URL hash (e.g. "#/settings" -> "settings") on
// first load. Anything unrecognized — including Supabase's own auth hash
// like "#access_token=..." — falls back to the dashboard.
const tabFromHash = () => {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return VALID_TAB_IDS.includes(raw) ? raw : "dashboard";
};

const Sidebar = ({ active, setActive, mobileOpen, setMobileOpen, user, profile, onSignOut }) => {
  const groups = NAV_GROUPS.map((g, i) =>
    i === NAV_GROUPS.length - 1 && profile?.is_admin ? { ...g, items: [...g.items, ADMIN_NAV_ITEM] } : g
  );
  return (
  <>
    <aside className={`fixed z-40 inset-y-0 left-0 w-64 bg-[var(--bg-primary)] border-r border-white/10 flex flex-col
      transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}>
      <div className="h-16 flex items-center gap-2 px-5 border-b border-white/10">
        <LogoFull size={30} textClass="text-base" />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto tj-scrollbar">
        {groups.map((group, gi) => (
          <div key={group.label || `group-${gi}`}>
            {group.label && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">{group.label}</div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button key={item.id} onClick={() => { setActive(item.id); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isActive ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}>
                    <Icon size={17} />{item.label}
                  </button>
                );
              })}
            </div>
            {gi < groups.length - 1 && <div className="mt-4 border-t border-white/10" />}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button onClick={() => setActive("profile")} className="w-full flex items-center gap-3 px-2 mb-2 rounded-lg hover:bg-[var(--bg-secondary)] py-1.5 transition-colors text-left">
          {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
            <img src={profile?.avatar_url || user.user_metadata.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
              {(profile?.username || user?.email || "?")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">{profile?.username || user?.email || "Trader"}</div>
              {profile?.is_admin && <AdminBadge />}
            </div>
          </div>
        </button>
        <button onClick={onSignOut} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--bg-secondary)] transition-colors">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
    {mobileOpen && <div className="fixed inset-0 bg-[var(--bg-primary)]/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}
  </>
  );
};

const NotificationBell = ({ session, profile, setActive }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("requests"); // "requests" | "activity"
  const [requests, setRequests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const ref = useRef(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchPendingFriendRequests(session.user.id).catch(() => []),
      fetchNotifications(session.user.id).catch(() => []),
    ]).then(([reqs, notifs]) => { setRequests(reqs); setActivity(notifs); }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const unsub1 = subscribeToFriendRequests(session.user.id, () => load());
    const unsub2 = subscribeToNotifications(session.user.id, () => load());
    return () => { unsub1(); unsub2(); };
  }, [session.user.id]);

  useEffect(() => {
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const accept = async (id) => {
    setAcceptingId(id);
    try {
      await acceptFriendRequest(id, profile?.username);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // no-op, leave request visible so they can retry
    } finally {
      setAcceptingId(null);
    }
  };

  const openActivityItem = async (n) => {
    if (!n.read) markNotificationRead(n.id).catch(() => {});
    setActivity((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setOpen(false);
    if (n.type === "message") setActive("messages");
    else if (n.type === "reply") setActive("forum");
    else if (n.type === "mention") setActive("forum");
    else if (n.type === "spotlight") setActive("forum");
    else if (n.type === "leaderboard_reset") setActive("leaderboard");
    else if (n.type === "badge_granted") setActive("profile");
  };

  const unreadActivity = activity.filter((n) => !n.read).length;
  const totalBadge = requests.length + unreadActivity;

  const activityLabel = (n) => {
    if (n.type === "reply") return `${n.from_username} replied to your post`;
    if (n.type === "message") return `${n.from_username} sent you a message`;
    if (n.type === "friend_accepted") return `${n.from_username} accepted your friend request`;
    if (n.type === "mention") return `${n.from_username} mentioned you`;
    if (n.type === "spotlight") return `New Trade of the Week: ${n.from_username}`;
    if (n.type === "leaderboard_reset") return "The leaderboard has reset — new week, fresh start";
    if (n.type === "badge_granted") return `You earned the "${badgeFromKey(n.body).label}" badge`;
    return "New activity";
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1.5">
        <Bell size={20} />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-[var(--text-primary)] text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {totalBadge}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-secondary)] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30">
          <div className="flex items-center gap-1 px-3 pt-3 border-b border-white/10">
            <button onClick={() => setTab("requests")}
              className={`flex-1 text-xs font-semibold px-2 py-2 rounded-t-md transition-colors ${tab === "requests" ? "text-[var(--accent)] border-b-2 border-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
              Friend Requests{requests.length > 0 ? ` (${requests.length})` : ""}
            </button>
            <button onClick={() => setTab("activity")}
              className={`flex-1 text-xs font-semibold px-2 py-2 rounded-t-md transition-colors ${tab === "activity" ? "text-[var(--accent)] border-b-2 border-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
              Activity{unreadActivity > 0 ? ` (${unreadActivity})` : ""}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={16} className="text-[var(--accent)] animate-spin" /></div>
            ) : tab === "requests" ? (
              requests.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-8 px-4">No pending requests.</p>
              ) : (
                requests.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.03]">
                    {r.requester?.avatar_url ? (
                      <img src={r.requester.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] shrink-0">
                        {(r.requester?.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{r.requester?.username || "Someone"}</span>
                    <button onClick={() => accept(r.id)} disabled={acceptingId === r.id}
                      className="flex items-center gap-1 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 text-[var(--text-inverse)] text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all shrink-0">
                      {acceptingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Accept
                    </button>
                  </div>
                ))
              )
            ) : activity.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-8 px-4">No activity yet.</p>
            ) : (
              activity.map((n) => (
                <button key={n.id} onClick={() => openActivityItem(n)}
                  className={`w-full text-left flex items-start gap-2.5 px-4 py-2.5 hover:bg-white/[0.03] transition-colors ${!n.read ? "bg-[var(--accent)]/5" : ""}`}>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />}
                  <div className={n.read ? "pl-3.5" : ""}>
                    <p className="text-sm text-[var(--text-primary)]">{activityLabel(n)}</p>
                    {n.body && <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{n.body}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TopBar = ({ title, subtitle, onMenu, onLogTrade, showLogTrade, session, profile, setActive }) => (
  <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-6 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur z-20">
    <div className="flex items-center gap-3">
      <button className="md:hidden text-[var(--text-tertiary)]" onClick={onMenu}><Menu size={22} /></button>
      <div>
        <h1 className="text-base md:text-lg font-bold text-[var(--text-primary)]">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--text-muted)] hidden sm:block">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2 md:gap-3">
      <ThemeToggle />
      <NotificationBell session={session} profile={profile} setActive={setActive} />
      {showLogTrade && (
        <button onClick={onLogTrade} className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] active:scale-95 text-[var(--text-inverse)] font-semibold text-sm px-3 md:px-4 py-2 rounded-lg transition-all">
          <Plus size={16} strokeWidth={2.5} /><span className="hidden sm:inline">Log Trade</span>
        </button>
      )}
    </div>
  </div>
);

/* ============================================================
   MODAL / DRAWER WRAPPERS
   ============================================================ */
const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--bg-primary)]/70 backdrop-blur-sm p-0 sm:p-4">
      <div className={`bg-[var(--bg-secondary)] border border-white/10 w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto tj-scrollbar tj-animate-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[var(--bg-secondary)] z-10">
          <h3 className="font-bold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const Drawer = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[var(--bg-primary)]/70 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border-l border-white/10 w-full sm:max-w-md h-full overflow-y-auto tj-scrollbar tj-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[var(--bg-secondary)] z-10">
          <h3 className="font-bold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const Field = ({ label, error, children }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{label}</label>
    {children}
    {error && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
  </div>
);

const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors";

/* ============================================================
   CREATE CHALLENGE MODAL
   ============================================================ */
const CreateChallengeModal = ({ open, onClose, onCreate }) => {
  const [form, setForm] = useState({ firm: "", phase: "Phase 1", accountSize: "", profitTargetPct: "", maxDailyLossPct: "", maxTotalLossPct: "", profitSplitPct: "80" });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isLive = form.phase === "Live";

  const submit = () => {
    const errs = {};
    if (!form.firm.trim()) errs.firm = "Prop firm name is required";
    ["accountSize", "maxDailyLossPct", "maxTotalLossPct"].forEach((k) => {
      if (!form[k] || Number(form[k]) <= 0) errs[k] = "Enter a valid positive number";
    });
    if (!isLive && (!form.profitTargetPct || Number(form.profitTargetPct) <= 0)) errs.profitTargetPct = "Enter a valid positive number";
    if (isLive && (!form.profitSplitPct || Number(form.profitSplitPct) <= 0 || Number(form.profitSplitPct) > 100)) errs.profitSplitPct = "Enter a split between 1-100";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onCreate({
      id: Date.now(), firm: form.firm, phase: isLive ? "Funded" : form.phase, stage: isLive ? "funded" : "evaluation",
      accountSize: Number(form.accountSize), profitTargetPct: Number(form.profitTargetPct || 0),
      maxDailyLossPct: Number(form.maxDailyLossPct), maxTotalLossPct: Number(form.maxTotalLossPct),
      minTradingDays: 10, startDate: "2026-07-10",
      ...(isLive ? { profitSplitPct: Number(form.profitSplitPct), lastPayoutNetProfit: 0, payoutHistory: [] } : {}),
    });
    setForm({ firm: "", phase: "Phase 1", accountSize: "", profitTargetPct: "", maxDailyLossPct: "", maxTotalLossPct: "", profitSplitPct: "80" });
    setErrors({});
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Challenge" wide>
      <Field label="Prop Firm Name" error={errors.firm}>
        <input className={inputCls} placeholder="e.g. FTMO, Alpha Capital, MyFundedFX" value={form.firm} onChange={(e) => set("firm", e.target.value)} />
      </Field>
      <Field label="Phase">
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {["Phase 1", "Phase 2", "Live"].map((p) => (
            <button key={p} type="button" onClick={() => set("phase", p)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${form.phase === p ? (p === "Live" ? "bg-emerald-500/20 text-emerald-400" : "bg-[var(--accent)]/20 text-[var(--accent)]") : "bg-[var(--bg-primary)] text-[var(--text-muted)]"}`}>
              {p}
            </button>
          ))}
        </div>
        {isLive && <p className="text-xs text-[var(--text-muted)] mt-1.5">Already funded and trading live? This skips straight to payout tracking below.</p>}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Account Size ($)" error={errors.accountSize}><input type="number" className={inputCls} placeholder="100000" value={form.accountSize} onChange={(e) => set("accountSize", e.target.value)} /></Field>
        {!isLive && (
          <Field label="Profit Target (%)" error={errors.profitTargetPct}><input type="number" className={inputCls} placeholder="10" value={form.profitTargetPct} onChange={(e) => set("profitTargetPct", e.target.value)} /></Field>
        )}
        <Field label="Max Daily Loss (%)" error={errors.maxDailyLossPct}><input type="number" className={inputCls} placeholder="5" value={form.maxDailyLossPct} onChange={(e) => set("maxDailyLossPct", e.target.value)} /></Field>
        <Field label="Max Total Loss (%)" error={errors.maxTotalLossPct}><input type="number" className={inputCls} placeholder="10" value={form.maxTotalLossPct} onChange={(e) => set("maxTotalLossPct", e.target.value)} /></Field>
      </div>

      {isLive && (
        <div className="mt-2 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3"><Banknote size={14} className="text-emerald-400" /><h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Payout Tracker</h4></div>
          <Field label="Profit Split (%)" error={errors.profitSplitPct}>
            <input type="number" className={inputCls} placeholder="80" value={form.profitSplitPct} onChange={(e) => set("profitSplitPct", e.target.value)} />
          </Field>
          <p className="text-xs text-[var(--text-faint)] -mt-2">The percentage of net profit you keep from each payout. You can request payouts and see your history from the challenge card once it's created.</p>
        </div>
      )}

      <button onClick={submit} className="w-full mt-2 bg-[var(--accent)] hover:bg-[var(--accent)] active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">Create Challenge</button>
    </Modal>
  );
};

/* ============================================================
   LOG TRADE MODAL
   ============================================================ */
const LogTradeModal = ({ open, onClose, onCreate, challenges }) => {
  const blank = () => ({ date: todayISO(), asset: "", direction: "Long", entry: "", exit: "", lots: "", fees: "", setup: "", setupGrade: "A", emotion: "Neutral", session: "London", status: "Win", holdingMinutes: "", notes: "", challengeId: "", screenshot: null, pnl: "" });
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("screenshot", reader.result);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    const errs = {};
    if (!form.asset.trim()) errs.asset = "Asset/pair is required";
    if (!form.entry || Number(form.entry) <= 0) errs.entry = "Enter entry price";
    if (!form.exit || Number(form.exit) <= 0) errs.exit = "Enter exit price";
    if (!form.lots || Number(form.lots) <= 0) errs.lots = "Enter lot size";
    if (form.pnl === "" || isNaN(Number(form.pnl))) errs.pnl = "Enter the trade's P&L";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const entry = Number(form.entry), exit = Number(form.exit), lots = Number(form.lots);
    const pnl = +Number(form.pnl).toFixed(2);

    onCreate({
      id: Date.now(), date: form.date, asset: form.asset.toUpperCase(), direction: form.direction,
      entry, exit, lots, fees: Number(form.fees || 0), setup: form.setup, setupGrade: form.setupGrade, session: form.session,
      status: form.status, pnl, holdingMinutes: Number(form.holdingMinutes || 0), emotion: form.emotion,
      challengeId: form.challengeId || null, notes: form.notes, screenshot: form.screenshot,
    });
    setForm(blank);
    setErrors({});
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Log a Trade" wide>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date / Time"><input type="date" className={inputCls} value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="Asset / Pair" error={errors.asset}>
          <select className={inputCls} value={form.asset} onChange={(e) => set("asset", e.target.value)}>
            <option value="">Select a pair...</option>
            {ASSETS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Direction">
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {["Long", "Short"].map((d) => (
              <button key={d} type="button" onClick={() => set("direction", d)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${form.direction === d ? (d === "Long" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400") : "bg-[var(--bg-primary)] text-[var(--text-muted)]"}`}>
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}><option>Win</option><option>Loss</option><option>BE</option></select>
        </Field>
        <Field label="Entry Price" error={errors.entry}><input type="number" step="any" className={inputCls} value={form.entry} onChange={(e) => set("entry", e.target.value)} /></Field>
        <Field label="Exit Price" error={errors.exit}><input type="number" step="any" className={inputCls} value={form.exit} onChange={(e) => set("exit", e.target.value)} /></Field>
        <Field label="Lot Size / Contracts" error={errors.lots}><input type="number" step="any" className={inputCls} value={form.lots} onChange={(e) => set("lots", e.target.value)} /></Field>
        <Field label="P&L ($)" error={errors.pnl}><input type="number" step="any" className={inputCls} placeholder="e.g. 240 or -85" value={form.pnl} onChange={(e) => set("pnl", e.target.value)} /></Field>
        <Field label="Fees / Commissions"><input type="number" step="any" className={inputCls} placeholder="0" value={form.fees} onChange={(e) => set("fees", e.target.value)} /></Field>
        <Field label="Setup / Strategy">
          <input className={inputCls} placeholder="e.g. Breakout, FVG, Trend Following — your own note" value={form.setup} onChange={(e) => set("setup", e.target.value)} />
        </Field>
        <Field label="Setup Quality">
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {SETUP_GRADES.map((g) => (
              <button key={g} type="button" onClick={() => set("setupGrade", g)}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${form.setupGrade === g ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                {g}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Session">
          <select className={inputCls} value={form.session} onChange={(e) => set("session", e.target.value)}>{SESSIONS.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <Field label="Holding Time (minutes)"><input type="number" className={inputCls} placeholder="45" value={form.holdingMinutes} onChange={(e) => set("holdingMinutes", e.target.value)} /></Field>
      </div>
      <Field label="Link to Challenge (optional)">
        <select className={inputCls} value={form.challengeId} onChange={(e) => set("challengeId", e.target.value)}>
          <option value="">Journal only — no challenge</option>
          {challenges.map((c) => <option key={c.id} value={c.id}>{c.firm} — {c.phase}</option>)}
        </select>
      </Field>
      <Field label="Chart Screenshot (optional)">
        <label className="flex items-center gap-2 justify-center border border-dashed border-[var(--border-secondary)] rounded-lg py-3 text-xs text-[var(--text-muted)] cursor-pointer hover:border-[var(--accent)]/50 hover:text-[var(--text-secondary)] transition-colors">
          <Upload size={14} /> {form.screenshot ? "Replace image" : "Upload chart screenshot"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
        {form.screenshot && <img src={form.screenshot} alt="preview" className="mt-2 rounded-lg border border-white/10 max-h-32 object-cover" />}
      </Field>
      <Field label="Emotion Behind the Trade">
        <div className="flex flex-wrap gap-2">
          {EMOTIONS.map((e) => (
            <button key={e} type="button" onClick={() => set("emotion", e)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${form.emotion === e
                ? (e === "Neutral" ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40" : "bg-amber-500/15 text-amber-400 border-amber-500/40")
                : "bg-[var(--bg-primary)] text-[var(--text-muted)] border-white/10 hover:text-[var(--text-secondary)]"}`}>
              {e}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Trading Psychology Notes">
        <textarea rows={3} className={inputCls} placeholder="How did you feel? Did you follow your plan?" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <button onClick={submit} className="w-full mt-2 bg-[var(--accent)] hover:bg-[var(--accent)] active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">Save Trade</button>
    </Modal>
  );
};

/* ============================================================
   TRADE DETAIL / EDIT DRAWER
   ============================================================ */
const TradeDrawer = ({ trade, onClose, onSave, onDelete, session, profile, addToast }) => {
  const [form, setForm] = useState(trade);
  const [editing, setEditing] = useState(false);
  const [submittingSpotlight, setSubmittingSpotlight] = useState(false);
  useEffect(() => { setForm(trade); setEditing(false); setSubmittingSpotlight(false); }, [trade]);
  if (!trade) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submitSpotlight = async () => {
    if (!session?.user?.id) return;
    setSubmittingSpotlight(true);
    try {
      await submitTradeSpotlight(trade, session.user.id, profile?.username || "Trader");
      addToast?.("Submitted — an admin will review it for the weekly spotlight");
    } catch (err) {
      addToast?.(err.message || "Failed to submit trade", "error");
    } finally {
      setSubmittingSpotlight(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("screenshot", reader.result);
    reader.readAsDataURL(file);
  };

  const save = () => {
    const entry = Number(form.entry), exit = Number(form.exit), lots = Number(form.lots);
    const pnl = +Number(form.pnl).toFixed(2);
    onSave({ ...form, entry, exit, lots, fees: Number(form.fees), pnl });
    setEditing(false);
  };

  return (
    <Drawer open={!!trade} onClose={onClose} title={editing ? "Edit Trade" : `${trade.asset} · ${trade.date}`}>
      {!editing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={trade.status} />
              <span className={`flex items-center gap-1 text-xs font-semibold ${trade.direction === "Long" ? "text-emerald-400" : "text-rose-400"}`}>
                {trade.direction === "Long" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {trade.direction}
              </span>
              {trade.setupGrade && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">{trade.setupGrade}</span>
              )}
              {trade.emotion && trade.emotion !== "Neutral" && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">{trade.emotion}</span>
              )}
            </div>
            <span className={`tj-mono text-lg font-bold ${trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{trade.pnl >= 0 ? "+" : ""}{fmtUSD2(trade.pnl)}</span>
          </div>

          {trade.screenshot && <img src={trade.screenshot} alt="chart" className="w-full rounded-lg border border-white/10" />}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[["Entry", trade.entry], ["Exit", trade.exit], ["Lots", trade.lots], ["Fees", fmtUSD2(trade.fees)],
              ["Setup", trade.setup], ["Session", trade.session], ["Holding", `${trade.holdingMinutes || 0} min`], ["Date", trade.date]].map(([k, v]) => (
              <div key={k} className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2">
                <div className="text-xs text-[var(--text-muted)]">{k}</div>
                <div className="tj-mono text-sm text-[var(--text-primary)] font-medium">{v}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-xs text-[var(--text-muted)] mb-1">Trading Psychology Notes</div>
            <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5 leading-relaxed">{trade.notes || "—"}</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditing(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--bg-secondary)] hover:bg-white text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">
              <Pencil size={14} /> Edit
            </button>
            <button onClick={() => onDelete(trade.id)} className="flex items-center justify-center gap-1.5 border border-rose-900 text-rose-400 hover:bg-rose-950 font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
              <Trash2 size={14} /> Delete
            </button>
          </div>
          <button onClick={submitSpotlight} disabled={submittingSpotlight}
            className="w-full flex items-center justify-center gap-1.5 border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-50 font-semibold text-sm py-2.5 rounded-lg transition-all">
            {submittingSpotlight ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />} Submit for Trade of the Week
          </button>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Asset">
              <select className={inputCls} value={form.asset} onChange={(e) => set("asset", e.target.value)}>
                {ASSETS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Direction">
              <select className={inputCls} value={form.direction} onChange={(e) => set("direction", e.target.value)}><option>Long</option><option>Short</option></select>
            </Field>
            <Field label="Entry"><input type="number" step="any" className={inputCls} value={form.entry} onChange={(e) => set("entry", e.target.value)} /></Field>
            <Field label="Exit"><input type="number" step="any" className={inputCls} value={form.exit} onChange={(e) => set("exit", e.target.value)} /></Field>
            <Field label="Lots"><input type="number" step="any" className={inputCls} value={form.lots} onChange={(e) => set("lots", e.target.value)} /></Field>
            <Field label="P&L ($)"><input type="number" step="any" className={inputCls} value={form.pnl} onChange={(e) => set("pnl", e.target.value)} /></Field>
            <Field label="Fees"><input type="number" step="any" className={inputCls} value={form.fees} onChange={(e) => set("fees", e.target.value)} /></Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}><option>Win</option><option>Loss</option><option>BE</option></select>
            </Field>
            <Field label="Holding (min)"><input type="number" className={inputCls} value={form.holdingMinutes} onChange={(e) => set("holdingMinutes", e.target.value)} /></Field>
          </div>
          <Field label="Setup Quality">
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {SETUP_GRADES.map((g) => (
                <button key={g} type="button" onClick={() => set("setupGrade", g)}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${form.setupGrade === g ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Emotion Behind the Trade">
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((e) => (
                <button key={e} type="button" onClick={() => set("emotion", e)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${form.emotion === e
                    ? (e === "Neutral" ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40" : "bg-amber-500/15 text-amber-400 border-amber-500/40")
                    : "bg-[var(--bg-primary)] text-[var(--text-muted)] border-white/10 hover:text-[var(--text-secondary)]"}`}>
                  {e}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Chart Screenshot">
            <label className="flex items-center gap-2 justify-center border border-dashed border-[var(--border-secondary)] rounded-lg py-3 text-xs text-[var(--text-muted)] cursor-pointer hover:border-[var(--accent)]/50 hover:text-[var(--text-secondary)] transition-colors">
              <ImageIcon size={14} /> {form.screenshot ? "Replace image" : "Upload chart screenshot"}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            {form.screenshot && <img src={form.screenshot} alt="preview" className="mt-2 rounded-lg border border-white/10 max-h-32 object-cover" />}
          </Field>
          <Field label="Notes"><textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">Save Changes</button>
            <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] text-sm font-medium hover:text-[var(--text-primary)] transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </Drawer>
  );
};

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */
const equityCurve = (trades) => {
  const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  return sorted.map((t) => { running += t.pnl - t.fees; return { date: t.date.slice(5), equity: +running.toFixed(2) }; });
};

const CustomTooltip = ({ active, payload, label, prefix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-[var(--text-muted)] mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tj-mono font-semibold" style={{ color: p.color || p.fill }}>{prefix}{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</div>
      ))}
    </div>
  );
};

const InsightsCard = ({ trades }) => {
  const [period, setPeriod] = useState("week"); // "week" | "month"
  const scoped = useMemo(() => filterTradesByPeriod(trades, period === "week" ? 7 : 30), [trades, period]);
  const { insights, sampleSize, ready } = useMemo(() => computeInsights(scoped, period === "week" ? "week" : "month"), [scoped, period]);

  const iconFor = (type) => {
    if (type === "strength") return <TrendingUp size={14} className="text-emerald-400 shrink-0 mt-0.5" />;
    if (type === "weakness") return <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />;
    if (type === "summary") return <Sparkles size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />;
    return <Info size={14} className="text-[var(--text-tertiary)] shrink-0 mt-0.5" />;
  };

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Performance Insights</h3>
          <p className="text-xs text-[var(--text-muted)]">Patterns from your own trade history — not advice, just what the data shows.</p>
        </div>
        <div className="flex items-center bg-[var(--bg-primary)] border border-white/10 rounded-lg p-0.5 shrink-0">
          <button onClick={() => setPeriod("week")} className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${period === "week" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)]"}`}>Week</button>
          <button onClick={() => setPeriod("month")} className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${period === "month" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)]"}`}>Month</button>
        </div>
      </div>

      {!ready ? (
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">No closed trades this {period} yet.</p>
          <p className="text-xs text-[var(--text-faint)] mt-1">Keep logging — insights unlock once there's enough data to spot real patterns.</p>
        </div>
      ) : (
        <div className="space-y-2.5 mt-3">
          {insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-2 text-sm ${ins.type === "summary" ? "font-semibold text-[var(--text-primary)] pb-2 border-b border-white/10" : "text-[var(--text-secondary)]"}`}>
              {iconFor(ins.type)}
              <span>{ins.text}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const DashboardPage = ({ trades, challenges, onOpenTrade }) => {
  const kpis = computeKPIs(trades);
  const curve = useMemo(() => equityCurve(trades), [trades]);
  const recent = trades.slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <KPICard icon={Wallet} label="Net Profit" value={fmtUSD2(kpis.netProfit)} accent={kpis.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} sub="all-time" />
        <KPICard icon={Percent} label="Win Rate" value={`${kpis.winRate.toFixed(1)}%`} sub={`${trades.filter(t=>t.status==='Win').length} wins`} />
        <KPICard icon={Target} label="Profit Factor" value={kpis.profitFactor === Infinity ? "∞" : kpis.profitFactor.toFixed(2)} sub="gross win / gross loss" />
        <KPICard icon={Activity} label="Total Trades" value={kpis.total} sub="logged entries" />
        <KPICard icon={ShieldCheck} label="Active Challenges" value={challenges.length} accent="text-[var(--accent)]" sub="funding evaluations" />
      </div>

      <InsightsCard trades={trades} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <Card className="xl:col-span-2 p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-bold text-[var(--text-primary)] text-sm">Equity Curve</h3><p className="text-xs text-[var(--text-muted)]">Cumulative net P&L over time</p></div>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          {curve.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={curve}>
                <defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip prefix="$" />} />
                <Area type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} fill="url(#eqGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={TrendingUp} title="No trades yet" sub="Log your first trade to see your equity curve." />}
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Active Challenges</h3>
          <div className="space-y-5">
            {challenges.slice(0, 2).map((c) => {
              const s = computeChallengeStats(c, trades);
              return (
                <div key={c.id} className="pb-4 border-b border-white/10 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{c.firm}</span>
                    <StatusPill status={s.status} />
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1"><span>{fmtUSD(s.currentBalance)}</span><span>Target {fmtUSD(s.targetBalance)}</span></div>
                  <ProgressBar pct={s.progressToTarget} />
                </div>
              );
            })}
            {challenges.length === 0 && <EmptyState icon={ShieldCheck} title="No challenges yet" sub="Create a funding challenge to start tracking rules." />}
          </div>
        </Card>
      </div>

      <CalendarCard trades={trades} onOpenTrade={onOpenTrade} />

      <Card className="p-4 md:p-5">
        <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Recent Trades</h3>
        {recent.length ? (
          <div className="overflow-x-auto tj-scrollbar">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] border-b border-white/10">
                  <th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Asset</th><th className="pb-2 font-medium">Dir</th>
                  <th className="pb-2 font-medium">Setup</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id} onClick={() => onOpenTrade(t)} className="border-b border-[var(--border-primary)] last:border-0 cursor-pointer hover:bg-[var(--bg-tertiary)]/40 transition-colors">
                    <td className="py-2.5 text-[var(--text-tertiary)] tj-mono text-xs">{t.date}</td>
                    <td className="py-2.5 text-[var(--text-primary)] font-medium">{t.asset}</td>
                    <td className={`py-2.5 ${t.direction === "Long" ? "text-emerald-400" : "text-rose-400"}`}>{t.direction}</td>
                    <td className="py-2.5 text-[var(--text-tertiary)]">{t.setup}</td>
                    <td className="py-2.5"><StatusPill status={t.status} /></td>
                    <td className={`py-2.5 text-right tj-mono font-semibold ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{t.pnl >= 0 ? "+" : ""}{fmtUSD2(t.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={BookOpen} title="No trades logged" sub="Click “Log Trade” in the top bar to add your first entry." />}
      </Card>
    </div>
  );
};

/* ============================================================
   CHALLENGES PAGE (cards + compare + payouts)
   ============================================================ */
const RuleRow = ({ ok, label, detail }) => (
  <div className="flex items-start gap-2.5 py-2">
    {ok ? <CheckCircle2 size={17} className="text-emerald-400 shrink-0 mt-0.5" /> : <XCircle size={17} className="text-rose-400 shrink-0 mt-0.5" />}
    <div><div className={`text-sm font-medium ${ok ? "text-[var(--text-primary)]" : "text-rose-300"}`}>{label}</div><div className="text-xs text-[var(--text-muted)]">{detail}</div></div>
  </div>
);

const FundedPanel = ({ challenge, stats, onRequestPayout }) => (
  <div className="mt-4 pt-4 border-t border-white/10">
    <div className="flex items-center gap-2 mb-3"><Banknote size={14} className="text-[var(--accent)]" /><h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Funded Account · Payouts</h4></div>
    <div className="grid grid-cols-2 gap-3 mb-3">
      <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2"><div className="text-xs text-[var(--text-muted)]">Profit Split</div><div className="tj-mono text-sm font-semibold text-[var(--text-primary)]">{challenge.profitSplitPct}%</div></div>
      <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2"><div className="text-xs text-[var(--text-muted)]">Available Payout</div><div className="tj-mono text-sm font-semibold text-emerald-400">{fmtUSD2(Math.max(0, stats.payoutAmount))}</div></div>
    </div>
    <button onClick={() => onRequestPayout(challenge.id)} disabled={stats.payoutAmount <= 0}
      className="w-full flex items-center justify-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-inverse)] font-semibold text-sm py-2 rounded-lg transition-all mb-3">
      <Banknote size={14} /> Request Payout
    </button>
    <div className="space-y-1.5 max-h-32 overflow-y-auto tj-scrollbar">
      {(challenge.payoutHistory || []).slice().reverse().map((p, i) => (
        <div key={i} className="flex justify-between text-xs bg-[var(--bg-primary)]/60 rounded-lg px-3 py-2">
          <span className="text-[var(--text-muted)]">{p.date}</span>
          <span className="tj-mono text-emerald-400 font-medium">+{fmtUSD2(p.amount)} <span className="text-[var(--text-faint)]">({p.split}% split)</span></span>
        </div>
      ))}
      {(!challenge.payoutHistory || challenge.payoutHistory.length === 0) && <p className="text-xs text-[var(--text-faint)]">No payouts requested yet.</p>}
    </div>
  </div>
);

const ChallengeDetailCard = ({ challenge, trades, onDelete, onMarkFunded, onRequestPayout, onExport }) => {
  const s = computeChallengeStats(challenge, trades);
  const isFunded = challenge.stage === "funded";
  return (
    <Card className="p-4 md:p-5 tj-animate-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2"><h3 className="font-bold text-[var(--text-primary)]">{challenge.firm}</h3><StatusPill status={s.status} /></div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{challenge.phase} · {fmtUSD(challenge.accountSize)} account{!isFunded ? ` · Day ${s.daysActive + 1}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onExport(challenge, s)} title="Export summary" className="text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"><Download size={16} /></button>
          <button onClick={() => onDelete(challenge.id)} title="Delete" className="text-[var(--text-faint)] hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-1">
        {!isFunded && (
          <div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5"><span>Balance</span><span className="tj-mono text-[var(--text-secondary)]">{fmtUSD(s.currentBalance)} / {fmtUSD(s.targetBalance)}</span></div>
            <ProgressBar pct={s.progressToTarget} color="bg-[var(--accent)]" />
            <div className="text-xs text-[var(--text-muted)] mt-1">{s.progressToTarget.toFixed(1)}% to profit target</div>
          </div>
        )}
        {isFunded && (
          <div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5"><span>Account Balance</span><span className="tj-mono text-[var(--text-secondary)]">{fmtUSD(s.currentBalance)}</span></div>
            <div className="text-lg tj-mono font-bold text-emerald-400">{s.netPnl >= 0 ? "+" : ""}{fmtUSD2(s.netPnl)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">net profit since funding</div>
          </div>
        )}
        <div className="space-y-3">
          <GaugeBar label="Daily Loss Limit" usedPct={s.dailyLossUsed} breached={s.dailyLossBreached} rightLabel={`${fmtUSD2(Math.abs(Math.min(s.worstDay,0)))} / ${fmtUSD(s.dailyLossLimit)}`} />
          <GaugeBar label="Max Overall Loss" usedPct={s.totalDrawdownUsed} breached={s.totalLossBreached} rightLabel={`${s.totalDrawdownUsed.toFixed(0)}% used`} />
        </div>
      </div>

      {!isFunded && (
        <div className="border-t border-white/10 pt-2 mt-3">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Rules Monitor</h4>
          <RuleRow ok={s.targetReached} label="Profit Target Reached" detail={s.targetReached ? "Target achieved — eligible to progress." : `${fmtUSD(s.targetBalance - s.currentBalance)} remaining to target.`} />
          <RuleRow ok={!s.dailyLossBreached} label="Daily Loss Limit Safe" detail={s.dailyLossBreached ? "Daily loss limit breached on worst trading day." : "No single day has exceeded the daily loss limit."} />
          <RuleRow ok={!s.totalLossBreached} label="Max Total Loss Safe" detail={s.totalLossBreached ? "Account drawdown breached the max total loss floor." : `${(100 - s.totalDrawdownUsed).toFixed(0)}% of drawdown buffer remaining.`} />
          <RuleRow ok={s.minDaysMet} label="Minimum Trading Days Met" detail={`${s.tradingDaysCount} / ${challenge.minTradingDays} required trading days logged.`} />
          {s.status === "Passed" && (
            <button onClick={() => onMarkFunded(challenge.id)} className="w-full mt-2 flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-sm py-2 rounded-lg hover:bg-emerald-500/20 transition-all">
              <Award size={14} /> Mark as Funded — Start Payouts
            </button>
          )}
        </div>
      )}

      {isFunded && <FundedPanel challenge={challenge} stats={s} onRequestPayout={onRequestPayout} />}
    </Card>
  );
};

const ComparisonTable = ({ challenges, trades }) => {
  const rows = challenges.map((c) => ({ c, s: computeChallengeStats(c, trades) }));
  const tightestDaily = rows.length ? Math.max(...rows.map((r) => r.s.dailyLossUsed)) : 0;
  const tightestTotal = rows.length ? Math.max(...rows.map((r) => r.s.totalDrawdownUsed)) : 0;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto tj-scrollbar">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]/60 border-b border-white/10">
              <th className="px-4 py-3 font-medium">Firm</th><th className="px-4 py-3 font-medium">Phase</th>
              <th className="px-4 py-3 font-medium">Balance</th><th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Daily Loss Used</th><th className="px-4 py-3 font-medium">Total Loss Used</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, s }) => (
              <tr key={c.id} className="border-b border-[var(--border-primary)] last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{c.firm}</td>
                <td className="px-4 py-3 text-[var(--text-tertiary)]">{c.phase}</td>
                <td className="px-4 py-3 tj-mono text-[var(--text-secondary)]">{fmtUSD(s.currentBalance)}</td>
                <td className="px-4 py-3 tj-mono text-[var(--text-secondary)]">{c.stage === "funded" ? "—" : `${s.progressToTarget.toFixed(0)}%`}</td>
                <td className={`px-4 py-3 tj-mono ${s.dailyLossUsed === tightestDaily && tightestDaily > 40 ? "text-[var(--accent)] font-semibold" : "text-[var(--text-tertiary)]"}`}>{s.dailyLossUsed.toFixed(0)}%{s.dailyLossUsed === tightestDaily && tightestDaily > 40 ? " · tightest" : ""}</td>
                <td className={`px-4 py-3 tj-mono ${s.totalDrawdownUsed === tightestTotal && tightestTotal > 40 ? "text-[var(--accent)] font-semibold" : "text-[var(--text-tertiary)]"}`}>{s.totalDrawdownUsed.toFixed(0)}%{s.totalDrawdownUsed === tightestTotal && tightestTotal > 40 ? " · tightest" : ""}</td>
                <td className="px-4 py-3"><StatusPill status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const ChallengesPage = ({ challenges, trades, onCreate, onDelete, onMarkFunded, onRequestPayout }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState("cards");
  const toast = useToast();

  const exportSummary = (challenge, s) => {
    const text = `${challenge.firm} — ${challenge.phase}\nStatus: ${s.status}\nBalance: ${fmtUSD2(s.currentBalance)}\nTarget: ${fmtUSD2(s.targetBalance)}\nDaily Loss Used: ${s.dailyLossUsed.toFixed(1)}%\nTotal Loss Used: ${s.totalDrawdownUsed.toFixed(1)}%\nTrading Days: ${s.tradingDaysCount}/${challenge.minTradingDays}\nGenerated: 2026-07-10`;
    downloadBlob(text, `${challenge.firm.replace(/\s+/g, "_")}_summary.txt`, "text/plain");
    toast(`Summary exported for ${challenge.firm}`, "info");
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-muted)]">Track funding evaluations, live rule compliance, and payouts.</p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button onClick={() => setView("cards")} className={`p-2 ${view === "cards" ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`} title="Card view"><LayoutGrid size={15} /></button>
            <button onClick={() => setView("compare")} className={`p-2 ${view === "compare" ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`} title="Compare view"><Table2 size={15} /></button>
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 bg-[var(--bg-secondary)] hover:bg-white text-[var(--text-inverse)] font-semibold text-sm px-3.5 py-2 rounded-lg transition-all active:scale-95">
            <Plus size={16} strokeWidth={2.5} /> New Challenge
          </button>
        </div>
      </div>

      {challenges.length === 0 ? (
        <Card><EmptyState icon={ShieldCheck} title="No challenges yet" sub="Create your first funding challenge to start tracking rule compliance." /></Card>
      ) : view === "cards" ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {challenges.map((c) => (
            <ChallengeDetailCard key={c.id} challenge={c} trades={trades} onDelete={onDelete} onMarkFunded={onMarkFunded} onRequestPayout={onRequestPayout} onExport={exportSummary} />
          ))}
        </div>
      ) : (
        <ComparisonTable challenges={challenges} trades={trades} />
      )}
      <CreateChallengeModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={onCreate} />
    </div>
  );
};

/* ============================================================
   JOURNAL PAGE (filters, sorting, export, drawer)
   ============================================================ */
const PAGE_SIZE = 8;

const SortHeader = ({ label, sortKey, sortConfig, onSort }) => (
  <th className="px-4 py-3 font-medium cursor-pointer select-none hover:text-[var(--text-secondary)] transition-colors" onClick={() => onSort(sortKey)}>
    <span className="flex items-center gap-1">{label}<ArrowUpDown size={11} className={sortConfig.key === sortKey ? "text-[var(--accent)]" : "text-[var(--text-faint)]"} /></span>
  </th>
);

const JournalPage = ({ trades, onDelete, onOpenTrade, onImportTrades, profile }) => {
  const [filters, setFilters] = useState({ asset: "All", setup: "All", outcome: "All", search: "" });
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "date", dir: "desc" });
  const [importing, setImporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const importInputRef = useRef(null);
  const toast = useToast();

  const setupOptions = useMemo(
    () => Array.from(new Set(trades.map((t) => t.setup).filter(Boolean))).sort(),
    [trades]
  );

  const filtered = useMemo(() => {
    let list = trades.filter((t) => {
      if (filters.asset !== "All" && t.asset !== filters.asset) return false;
      if (filters.setup !== "All" && t.setup !== filters.setup) return false;
      if (filters.outcome !== "All" && t.status !== filters.outcome) return false;
      if (filters.search && !t.asset.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let av = a[sortConfig.key], bv = b[sortConfig.key];
      if (sortConfig.key === "date") { av = new Date(av); bv = new Date(bv); }
      if (av < bv) return sortConfig.dir === "asc" ? -1 : 1;
      if (av > bv) return sortConfig.dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [trades, filters, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const onSort = (key) => setSortConfig((sc) => ({ key, dir: sc.key === key && sc.dir === "desc" ? "asc" : "desc" }));

  const exportCSV = () => { downloadBlob(tradesToCSV(filtered), "trade_journal_export.csv"); toast(`Exported ${filtered.length} trades to CSV`, "info"); };

  const exportPDF = async () => {
    setExportingPdf(true);
    try {
      await tradesToPDF(filtered, { username: profile?.username });
      toast(`Exported ${filtered.length} trades to PDF`, "info");
    } catch (err) {
      toast(err.message || "Failed to export PDF", "error");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { trades: parsed, errors } = csvToTrades(text);
      if (!parsed.length) {
        toast(errors[0] || "No valid rows found in that file.", "error");
        return;
      }
      await onImportTrades(parsed);
      toast(`Imported ${parsed.length} trade${parsed.length === 1 ? "" : "s"}${errors.length ? ` (${errors.length} row${errors.length === 1 ? "" : "s"} skipped)` : ""}`, "success");
    } catch (err) {
      toast(err.message || "Failed to import file.", "error");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Card className="p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-1.5 flex-1 min-w-[160px]">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input placeholder="Search asset..." className="bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder-zinc-600 w-full" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} />
          </div>
          <select className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)]" value={filters.asset} onChange={(e) => setFilter("asset", e.target.value)}><option>All</option>{ASSETS.map((a) => <option key={a}>{a}</option>)}</select>
          <select className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)]" value={filters.setup} onChange={(e) => setFilter("setup", e.target.value)}><option>All</option>{setupOptions.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)]" value={filters.outcome} onChange={(e) => setFilter("outcome", e.target.value)}><option>All</option><option>Win</option><option>Loss</option><option>BE</option></select>
          <button onClick={exportCSV} className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-primary)] text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"><Download size={13} /> CSV</button>
          <button onClick={exportPDF} disabled={exportingPdf} className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] disabled:opacity-40 text-[var(--text-primary)] text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} PDF
          </button>
          <input ref={importInputRef} type="file" accept=".csv" onChange={handleImportFile} className="hidden" />
          <button onClick={() => importInputRef.current?.click()} disabled={importing}
            title="Import trades from a CSV file (e.g. exported from MT4/MT5 or a prop firm)"
            className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] disabled:opacity-40 text-[var(--text-primary)] text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Import CSV
          </button>
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] ml-auto"><Filter size={12} /> {filtered.length} trades</div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {pageData.length === 0 && filtered.length === 0 && trades.length === 0 ? (
          <EmptyState icon={BookOpen} title="No trades logged yet" sub="Your journal is empty — log a trade to get started." />
        ) : (
          <>
            <div className="overflow-x-auto tj-scrollbar">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]/60 border-b border-white/10">
                    <SortHeader label="Date" sortKey="date" sortConfig={sortConfig} onSort={onSort} />
                    <SortHeader label="Asset" sortKey="asset" sortConfig={sortConfig} onSort={onSort} />
                    <th className="px-4 py-3 font-medium">Dir</th>
                    <th className="px-4 py-3 font-medium">Entry</th>
                    <th className="px-4 py-3 font-medium">Exit</th>
                    <th className="px-4 py-3 font-medium">Setup</th>
                    <th className="px-4 py-3 font-medium">Session</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <SortHeader label="P&L" sortKey="pnl" sortConfig={sortConfig} onSort={onSort} />
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((t) => (
                    <tr key={t.id} onClick={() => onOpenTrade(t)} className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-secondary)]/40 transition-colors group cursor-pointer">
                      <td className="px-4 py-3 tj-mono text-xs text-[var(--text-tertiary)]">{t.date}</td>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{t.asset}</td>
                      <td className="px-4 py-3"><span className={`flex items-center gap-1 text-xs font-medium ${t.direction === "Long" ? "text-emerald-400" : "text-rose-400"}`}>{t.direction === "Long" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {t.direction}</span></td>
                      <td className="px-4 py-3 tj-mono text-xs text-[var(--text-tertiary)]">{t.entry}</td>
                      <td className="px-4 py-3 tj-mono text-xs text-[var(--text-tertiary)]">{t.exit}</td>
                      <td className="px-4 py-3 text-[var(--text-tertiary)]">{t.setup}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{t.session}</td>
                      <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                      <td className={`px-4 py-3 text-right tj-mono font-semibold ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{t.pnl >= 0 ? "+" : ""}{fmtUSD2(t.pnl)}</td>
                      <td className="px-4 py-3">
                        <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="opacity-0 group-hover:opacity-100 text-[var(--text-faint)] hover:text-rose-400 transition-all"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  {pageData.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-[var(--text-muted)] text-sm">No trades match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <span className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-white/10 disabled:opacity-30 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"><ChevronLeft size={15} /></button>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-white/10 disabled:opacity-30 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"><ChevronRight size={15} /></button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

/* ============================================================
   CALENDAR PAGE (P&L heatmap)
   ============================================================ */
const CalendarCard = ({ trades, onOpenTrade }) => {
  const [cursor, setCursor] = useState(new Date(2026, 6, 1)); // July 2026
  const [now, setNow] = useState(new Date());

  // Keep "today" accurate in real time (e.g. across a midnight rollover
  // while the dashboard is left open) without requiring a page refresh.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const byDay = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      if (!map[t.date]) map[t.date] = { pnl: 0, count: 0, trades: [] };
      map[t.date].pnl += t.pnl - t.fees;
      map[t.date].count += 1;
      map[t.date].trades.push(t);
    });
    return map;
  }, [trades]);

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const maxAbs = Math.max(1, ...Object.values(byDay).map((d) => Math.abs(d.pnl)));

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const cellColor = (pnl) => {
    if (pnl === undefined) return "bg-[var(--bg-secondary)]/60";
    if (pnl === 0) return "bg-[var(--bg-tertiary)]";
    const intensity = clamp(Math.abs(pnl) / maxAbs, 0.15, 1);
    return pnl > 0 ? `bg-emerald-500` : `bg-rose-500`;
  };
  const cellOpacity = (pnl) => (pnl ? clamp(Math.abs(pnl) / maxAbs, 0.18, 0.9) : 1);

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthTotal = Object.entries(byDay).filter(([date]) => new Date(date).getMonth() === month && new Date(date).getFullYear() === year).reduce((s, [, v]) => s + v.pnl, 0);

  return (
    <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">{monthLabel}</h3>
            <p className={`text-xs tj-mono ${monthTotal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{monthTotal >= 0 ? "+" : ""}{fmtUSD2(monthTotal)} net this month</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"><ChevronLeft size={15} /></button>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"><ChevronRight size={15} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-center text-xs text-[var(--text-muted)] font-medium py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const info = byDay[dateStr];
            const isToday = dateStr === todayStr;
            return (
              <button key={i} onClick={() => info?.trades?.[0] && onOpenTrade(info.trades[0])}
                className={`relative aspect-square rounded-lg border flex flex-col items-center justify-center transition-transform hover:scale-[1.04] ${info ? "cursor-pointer" : "cursor-default"} ${info ? cellColor(info.pnl) : "bg-[var(--bg-secondary)]/40"} ${isToday ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/60" : "border-white/10"}`}
                style={info ? { backgroundColor: info.pnl > 0 ? `rgba(16,185,129,${cellOpacity(info.pnl)})` : info.pnl < 0 ? `rgba(244,63,94,${cellOpacity(info.pnl)})` : "#3f3f46" } : {}}>
                {isToday && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />}
                <span className={`text-[11px] font-medium ${isToday ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>{d}</span>
                {info ? (
                  <>
                    <span className="text-[10px] tj-mono text-[var(--text-primary)] font-semibold leading-tight">{info.pnl >= 0 ? "+$" : "-$"}{Math.abs(Math.round(info.pnl))}</span>
                    <span className="text-[9px] tj-mono text-[var(--text-primary)]/80 leading-tight">{info.count} trade{info.count === 1 ? "" : "s"}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] tj-mono text-[var(--text-faint)] leading-tight">0 Trade</span>
                    <span className="text-[10px] tj-mono text-[var(--text-faint)] font-medium leading-tight">$0</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-5 text-xs text-[var(--text-muted)] flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Profitable day</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500" /> Losing day</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[var(--bg-tertiary)]" /> No trades</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-[var(--accent)] ring-1 ring-[var(--accent)]/60" /> Today</span>
        </div>
      </Card>
  );
};

/* ============================================================
   ANALYTICS PAGE
   ============================================================ */
const PIE_COLORS = ["#10b981", "#f43f5e", "#71717a"];

const AnalyticsPage = ({ trades }) => {
  const kpis = computeKPIs(trades);
  const streaks = computeStreaks(trades);

  const winLossData = useMemo(() => {
    const wins = trades.filter((t) => t.status === "Win").length;
    const losses = trades.filter((t) => t.status === "Loss").length;
    const be = trades.filter((t) => t.status === "BE").length;
    return [{ name: "Win", value: wins }, { name: "Loss", value: losses }, { name: "BE", value: be }];
  }, [trades]);

  const byAsset = useMemo(() => {
    const map = {};
    trades.forEach((t) => { map[t.asset] = (map[t.asset] || 0) + t.pnl - t.fees; });
    return Object.entries(map).map(([asset, pnl]) => ({ asset, pnl: +pnl.toFixed(2) })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const byDow = useMemo(() => {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = {};
    trades.forEach((t) => { const d = names[new Date(t.date).getDay()]; map[d] = (map[d] || 0) + t.pnl - t.fees; });
    return names.filter((n) => map[n] !== undefined).map((n) => ({ day: n, pnl: +map[n].toFixed(2) }));
  }, [trades]);

  const bySession = useMemo(() => {
    const map = {};
    trades.forEach((t) => { map[t.session] = (map[t.session] || 0) + t.pnl - t.fees; });
    return SESSIONS.map((s) => ({ session: s, pnl: +(map[s] || 0).toFixed(2) }));
  }, [trades]);

  if (trades.length === 0) {
    return <div className="p-4 md:p-6"><Card><EmptyState icon={BarChart3} title="No data to analyze yet" sub="Log a few trades and your analytics will appear here." /></Card></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard icon={Percent} label="Win Rate" value={`${kpis.winRate.toFixed(1)}%`} />
        <KPICard icon={Target} label="Profit Factor" value={kpis.profitFactor === Infinity ? "∞" : kpis.profitFactor.toFixed(2)} />
        <KPICard icon={Flame} label="Avg R:R Realized" value={`${kpis.avgRR.toFixed(2)}R`} />
        <KPICard icon={Wallet} label="Net Profit" value={fmtUSD2(kpis.netProfit)} accent={kpis.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} />
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4"><Award size={15} className="text-[var(--accent)]" /><h3 className="font-bold text-[var(--text-primary)] text-sm">Discipline & Streaks</h3></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
            <div className="text-xs text-[var(--text-muted)]">Current Streak</div>
            <div className={`tj-mono text-lg font-bold ${streaks.currentType === "Win" ? "text-emerald-400" : "text-rose-400"}`}>{streaks.currentCount} {streaks.currentType || "—"}{streaks.currentCount === 1 ? "" : "s"}</div>
          </div>
          <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
            <div className="text-xs text-[var(--text-muted)]">Longest Win Streak</div>
            <div className="tj-mono text-lg font-bold text-emerald-400">{streaks.longestWin}</div>
          </div>
          <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1"><Clock size={11} /> Avg Holding Time</div>
            <div className="tj-mono text-lg font-bold text-[var(--text-primary)]">{Math.round(streaks.avgHold)}m</div>
          </div>
          <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
            <div className="text-xs text-[var(--text-muted)]">Days Since Last Loss</div>
            <div className="tj-mono text-lg font-bold text-[var(--text-primary)]">{streaks.daysSinceLastLoss ?? "—"}</div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="p-4 md:p-5">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Win / Loss Ratio</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={winLossData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {winLossData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Most Profitable Assets</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byAsset} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="asset" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} width={62} />
              <Tooltip content={<CustomTooltip prefix="$" />} />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>{byAsset.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#f43f5e"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Performance by Day of Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip prefix="$" />} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{byDow.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#f43f5e"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Performance by Session</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bySession}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="session" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip prefix="$" />} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{bySession.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#f43f5e"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

/* ============================================================
   MARKET HEATMAPS (live TradingView widgets — Stocks + Crypto)
   ============================================================ */
const MarketHeatmapsPage = () => {
  const containerRef = useRef(null);
  const [market, setMarket] = useState("stocks"); // "stocks" | "crypto"

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;

    if (market === "stocks") {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
      script.text = JSON.stringify({
        exchanges: [],
        dataSource: "SPX500",
        grouping: "sector",
        blockSize: "market_cap_basic",
        blockColor: "change",
        locale: "en",
        symbolUrl: "",
        colorTheme: "dark",
        hasTopBar: true,
        isDataSetEnabled: true,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: "100%",
        height: "600",
      });
    } else {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js";
      script.text = JSON.stringify({
        dataSource: "Crypto",
        blockSize: "market_cap_calc",
        blockColor: "change",
        locale: "en",
        symbolUrl: "",
        colorTheme: "dark",
        hasTopBar: true,
        isDataSetEnabled: true,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: "100%",
        height: "600",
      });
    }
    containerRef.current.appendChild(script);
  }, [market]);

  return (
    <div className="p-4 md:p-6">
      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Grid3x3 size={16} className="text-[var(--accent)]" />
              <h3 className="font-bold text-[var(--text-primary)] text-sm">Market Heatmap</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Live performance across the market — block size by market cap, color by daily change.</p>
          </div>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button onClick={() => setMarket("stocks")} className={`px-4 py-2 text-sm font-medium transition-colors ${market === "stocks" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-tertiary)]"}`}>Stocks</button>
            <button onClick={() => setMarket("crypto")} className={`px-4 py-2 text-sm font-medium transition-colors ${market === "crypto" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-tertiary)]"}`}>Crypto</button>
          </div>
        </div>
        <div className="tradingview-widget-container rounded-lg overflow-hidden" ref={containerRef}>
          <div className="tradingview-widget-container__widget" />
        </div>
      </Card>
    </div>
  );
};

/* ============================================================
   ECONOMIC CALENDAR (live TradingView widget — dark themed to match
   the rest of the app; events are natively grouped by day)
   ============================================================ */
const IMPACT_LEVELS = [
  { value: "1", label: "High", dot: "bg-rose-500", active: "bg-rose-500/15 border-rose-500/40 text-rose-300" },
  { value: "0", label: "Medium", dot: "bg-orange-400", active: "bg-orange-400/15 border-orange-400/40 text-orange-300" },
  { value: "-1", label: "Low", dot: "bg-white", active: "bg-white/15 border-white/40 text-[var(--text-primary)]" },
];

const ECON_COUNTRIES = [
  { code: "us", label: "United States" },
  { code: "eu", label: "Euro Zone" },
  { code: "gb", label: "United Kingdom" },
  { code: "jp", label: "Japan" },
  { code: "cn", label: "China" },
  { code: "au", label: "Australia" },
  { code: "ca", label: "Canada" },
  { code: "ch", label: "Switzerland" },
  { code: "nz", label: "New Zealand" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
];

const EconomicCalendarPage = () => {
  const containerRef = useRef(null);
  const [impacts, setImpacts] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("econCalendar.impacts")); return Array.isArray(saved) ? saved : ["1", "0", "-1"]; }
    catch { return ["1", "0", "-1"]; }
  });
  const [countries, setCountries] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("econCalendar.countries")); return Array.isArray(saved) ? saved : ECON_COUNTRIES.map((c) => c.code); }
    catch { return ECON_COUNTRIES.map((c) => c.code); }
  });
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);

  const toggleImpact = (v) => setImpacts((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleCountry = (code) => setCountries((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  const allCountriesSelected = countries.length === ECON_COUNTRIES.length;
  const toggleAllCountries = () => setCountries(allCountriesSelected ? [] : ECON_COUNTRIES.map((c) => c.code));

  useEffect(() => {
    try { localStorage.setItem("econCalendar.impacts", JSON.stringify(impacts)); } catch {}
  }, [impacts]);

  useEffect(() => {
    try { localStorage.setItem("econCalendar.countries", JSON.stringify(countries)); } catch {}
  }, [countries]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.type = "text/javascript";
    script.async = true;
    const config = {
      colorTheme: "dark",
      isTransparent: true,
      width: "100%",
      height: "680",
      locale: "en",
      importanceFilter: impacts.length ? impacts.join(",") : "-1,0,1",
    };
    if (countries.length && countries.length < ECON_COUNTRIES.length) config.countryFilter = countries.join(",");
    script.text = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, [impacts, countries]);

  return (
    <div className="p-4 md:p-6">
      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock size={16} className="text-[var(--accent)]" />
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Economic Calendar</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">Live economic events, grouped by day — rate decisions, CPI, NFP, and more that can move the markets you trade.</p>

        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-white/10">
          {IMPACT_LEVELS.map((lvl) => {
            const on = impacts.includes(lvl.value);
            return (
              <button key={lvl.value} onClick={() => toggleImpact(lvl.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${on ? lvl.active : "bg-[var(--bg-primary)] border-white/10 text-[var(--text-muted)]"}`}>
                <Folder size={13} className={on ? lvl.dot.replace("bg-", "text-") : "text-[var(--text-faint)]"} fill="currentColor" fillOpacity={on ? 1 : 0} />
                {lvl.label}
              </button>
            );
          })}

          <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

          <div className="relative">
            <button onClick={() => setCountryMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-[var(--bg-primary)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)]/40 transition-colors">
              <Filter size={12} /> Countries {allCountriesSelected ? "(All)" : `(${countries.length})`}
            </button>
            {countryMenuOpen && (
              <div className="absolute z-30 mt-2 w-56 bg-[var(--bg-primary)] border border-white/10 rounded-lg shadow-2xl p-2 tj-animate-in">
                <button onClick={toggleAllCountries} className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-[var(--accent)] hover:bg-white/5 transition-colors mb-1">
                  {allCountriesSelected ? "Clear all" : "Select all"}
                </button>
                <div className="max-h-56 overflow-y-auto tj-scrollbar space-y-0.5">
                  {ECON_COUNTRIES.map((c) => (
                    <label key={c.code} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-white/5 cursor-pointer transition-colors">
                      <input type="checkbox" checked={countries.includes(c.code)} onChange={() => toggleCountry(c.code)} className="accent-blue-500" />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="tradingview-widget-container rounded-lg overflow-hidden" ref={containerRef}>
          <div className="tradingview-widget-container__widget" />
        </div>
      </Card>
    </div>
  );
};


/* ============================================================
   SETTINGS PAGE
   ============================================================ */
const passwordStrength = (pw) => {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Very weak", color: "bg-rose-500" },
    { label: "Weak", color: "bg-rose-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-amber-400" },
    { label: "Strong", color: "bg-emerald-500" },
    { label: "Very strong", color: "bg-emerald-500" },
  ];
  return { score, ...levels[Math.min(score, levels.length - 1)] };
};

const SETTINGS_TABS = [
  { id: "account", label: "Account", icon: UserCircle },
  { id: "security", label: "Security", icon: Shield },
  { id: "trading", label: "Trading", icon: Target },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

const SettingsPage = ({ settings, onSave, session, profile, onProfileUpdate, onSignOut }) => {
  const [form, setForm] = useState(settings);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => { onSave(form); toast("Preferences saved", "success"); };
  const [tab, setTab] = useState("account");

  const [username, setUsername] = useState(profile?.username || "");
  const [usernameError, setUsernameError] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const copyUserId = () => {
    if (!session?.user?.id) return;
    navigator.clipboard?.writeText(session.user.id);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 1500);
  };

  const saveUsername = async () => {
    const clean = username.trim();
    setUsernameError("");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
      setUsernameError("Username must be 3-20 characters: letters, numbers, and underscores only.");
      return;
    }
    if (clean === profile?.username) return;
    setUsernameLoading(true);
    try {
      const updated = await updateProfileUsername(session.user.id, clean);
      onProfileUpdate(updated);
      toast("Username updated", "success");
    } catch (err) {
      if (err.code === "23505" || /duplicate/i.test(err.message || "")) setUsernameError("That username is already taken — try another.");
      else setUsernameError(err.message || "Something went wrong. Please try again.");
    } finally {
      setUsernameLoading(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const strength = passwordStrength(newPassword);

  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const toggleLeaderboardOptIn = async () => {
    setLeaderboardLoading(true);
    try {
      const updated = await setLeaderboardOptIn(session.user.id, !profile?.leaderboard_opt_in);
      onProfileUpdate(updated);
      toast(updated.leaderboard_opt_in ? "You're on the leaderboard" : "Removed from the leaderboard", "success");
    } catch (err) {
      toast(err.message || "Failed to update leaderboard setting", "error");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const changePassword = async () => {
    setPasswordError("");
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("New passwords don't match."); return; }
    setPasswordLoading(true);
    try {
      // Re-authenticate with the current password before allowing the change.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (signInErr) { setPasswordError("Current password is incorrect."); return; }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) { setPasswordError(updateErr.message || "Failed to update password."); return; }

      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast("Password updated", "success");
    } catch (err) {
      setPasswordError(err.message || "Something went wrong. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const lastSignIn = session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at) : null;

  const Toggle = ({ checked, onChange, disabled }) => (
    <button onClick={onChange} disabled={disabled}
      className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-[var(--accent)]" : "bg-[var(--bg-quaternary)]"} disabled:opacity-50`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account, security, and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab nav */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-48 shrink-0 pb-1 md:pb-0">
          {SETTINGS_TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 text-sm font-medium px-3 py-2.5 rounded-lg whitespace-nowrap transition-colors text-left
                  ${active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"}
                  ${t.id === "danger" && !active ? "text-rose-400/80 hover:text-rose-400" : ""}`}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0 space-y-5">
          {tab === "account" && (
            <>
              <Card className="p-5 md:p-6">
                <SectionHeader title="Account" subtitle="Your identity on Strike Journal." />
                <Field label="Email">
                  <input className={inputCls} value={session?.user?.email || ""} disabled />
                </Field>
                <Field label="Username" error={usernameError}>
                  <div className="flex gap-2">
                    <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} />
                    <button onClick={saveUsername} disabled={usernameLoading || username.trim() === profile?.username}
                      className="shrink-0 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[var(--text-inverse)] font-semibold text-sm px-3.5 rounded-lg transition-all">
                      {usernameLoading ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                    </button>
                  </div>
                </Field>
                <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--border-primary)]">
                  <div>
                    <div className="text-xs text-[var(--text-muted)] mb-1">Member since</div>
                    <div className="text-sm text-[var(--text-secondary)]">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-muted)] mb-1">Last sign in</div>
                    <div className="text-sm text-[var(--text-secondary)]">{lastSignIn ? lastSignIn.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <SectionHeader title="Support & Account ID" subtitle="Include this ID when contacting support about your account." />
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-secondary)] truncate">
                    {session?.user?.id || "—"}
                  </code>
                  <button onClick={copyUserId} className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-primary)] font-semibold text-xs px-3 py-2.5 rounded-lg transition-all shrink-0">
                    {idCopied ? <Check size={13} /> : <Copy size={13} />} {idCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </Card>
            </>
          )}

          {tab === "security" && (
            <>
              <Card className="p-5 md:p-6">
                <SectionHeader title="Change Password" icon={<KeyRound size={14} />} subtitle="You'll need your current password to set a new one." />
                <Field label="Current Password">
                  <div className="relative">
                    <input type={showCurrentPw ? "text" : "password"} className={`${inputCls} pr-9`} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowCurrentPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
                <Field label="New Password">
                  <div className="relative">
                    <input type={showNewPw ? "text" : "password"} className={`${inputCls} pr-9`} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowNewPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${i < strength.score ? strength.color : "bg-[var(--bg-quaternary)]"}`} />
                        ))}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">{strength.label}</div>
                    </div>
                  )}
                </Field>
                <Field label="Confirm New Password" error={passwordError}>
                  <input type={showNewPw ? "text" : "password"} className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                </Field>
                <button onClick={changePassword} disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
                  {passwordLoading ? <Loader2 size={15} className="animate-spin" /> : null}
                  Change Password
                </button>
              </Card>

              <Card className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1 flex items-center gap-1.5"><Award size={15} className="text-[var(--accent)]" /> Leaderboard</h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Show your win rate and net P&amp;L on the weekly/monthly leaderboard. Off by default — your results stay private until you opt in.</p>
                  </div>
                  <Toggle checked={!!profile?.leaderboard_opt_in} onChange={toggleLeaderboardOptIn} disabled={leaderboardLoading} />
                </div>
              </Card>
            </>
          )}

          {tab === "trading" && (
            <>
              <Card className="p-5 md:p-6">
                <SectionHeader title="Trading Preferences" icon={<Target size={14} />} subtitle="Defaults used across your journal and challenges." />
                <div className="grid sm:grid-cols-2 gap-x-4">
                  <Field label="Display Currency">
                    <select className={inputCls} value={form.currency} onChange={(e) => set("currency", e.target.value)}><option>USD</option><option>EUR</option><option>GBP</option></select>
                  </Field>
                  <Field label="Timezone">
                    <select className={inputCls} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                      <option>UTC</option><option>America/New_York</option><option>Europe/London</option><option>Asia/Tokyo</option>
                    </select>
                  </Field>
                  <Field label="Default Risk per Trade (%)">
                    <input type="number" step="0.1" className={inputCls} value={form.defaultRiskPct} onChange={(e) => set("defaultRiskPct", e.target.value)} />
                  </Field>
                  <Field label="Minimum Trading Days (new challenges)">
                    <input type="number" className={inputCls} value={form.minTradingDays} onChange={(e) => set("minTradingDays", e.target.value)} />
                  </Field>
                </div>
                <button onClick={save} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">Save Preferences</button>
              </Card>

              <Card className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1 flex items-center gap-1.5"><BellRing size={15} className="text-[var(--accent)]" /> Trade Reminders</h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Get a gentle nudge to log a trade if you haven't journaled by end of session.</p>
                  </div>
                  <Toggle checked={!!form.tradeReminders} onChange={() => { const v = !form.tradeReminders; set("tradeReminders", v); onSave({ ...form, tradeReminders: v }); }} />
                </div>
              </Card>
            </>
          )}

          {tab === "appearance" && (
            <Card className="p-5 md:p-6">
              <SectionHeader title="Appearance" icon={<Palette size={14} />} subtitle="Switch between the black and white theme." />
              <div className="flex items-center justify-between gap-4 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Theme</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">Your preference is saved on this device.</div>
                </div>
                <ThemeToggle />
              </div>
            </Card>
          )}

          {tab === "danger" && (
            <>
              <Card className="p-5 md:p-6">
                <SectionHeader title="Sign Out" subtitle="End your session on this device." />
                <button onClick={onSignOut} className="flex items-center gap-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-primary)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
                  <LogOut size={15} /> Sign Out
                </button>
              </Card>

              <Card className="p-5 md:p-6 border-rose-900/50">
                <SectionHeader title="Delete Account" icon={<AlertTriangle size={14} className="text-rose-400" />} subtitle="Permanently delete your account, trades, and journal entries. This can't be undone." />
                <a href={`mailto:support@strikejournal.com?subject=Account%20deletion%20request&body=Please%20delete%20my%20account%20(${encodeURIComponent(session?.user?.email || "")}).`}
                  className="inline-flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
                  <Ban size={15} /> Request Account Deletion
                </a>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   PROFILE SETUP (mandatory username + age, once per account)
   ============================================================ */
const ProfileSetup = ({ session, onComplete }) => {
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const cleanUsername = username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      setError("Username must be 3-20 characters: letters, numbers, and underscores only.");
      return;
    }
    const ageNum = Number(age);
    if (!age || !Number.isInteger(ageNum) || ageNum < 18 || ageNum > 120) {
      setError("You must enter a valid age, 18 or older, to use Strike Journal.");
      return;
    }
    setLoading(true);
    try {
      const profile = await createProfile(session.user.id, cleanUsername, ageNum);
      const refCode = new URLSearchParams(window.location.search).get("ref");
      if (refCode) applyReferralCode(session.user.id, refCode).catch(() => {});
      onComplete(profile);
    } catch (err) {
      if (err.code === "23505" || /duplicate/i.test(err.message || "")) setError("That username is already taken — try another.");
      else setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4">
      <GlobalStyle />
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <LogoFull size={34} textClass="text-xl" />
        </div>
        <Card className="p-6 tj-animate-in">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle size={18} className="text-[var(--accent)]" />
            <h2 className="font-bold text-[var(--text-primary)]">Complete your profile</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-5">One last step before you get started — this is how other traders will see you on the forum.</p>
          <form onSubmit={submit}>
            <Field label="Username">
              <input className={inputCls} placeholder="e.g. edgehunter_23" value={username} onChange={(e) => setUsername(e.target.value)} />
            </Field>
            <Field label="Age">
              <input type="number" className={inputCls} placeholder="18+" value={age} onChange={(e) => setAge(e.target.value)} />
            </Field>
            {error && <p className="text-xs text-rose-400 mb-3 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Continue
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
};

/* ============================================================
   AUTH PAGE (Google + email/password via Supabase)
   ============================================================ */
const AuthPage = ({ onBack }) => {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const signInWithGoogle = async () => {
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (err) { setError(err.message); setLoading(false); }
    // on success the browser redirects to Google, so no further action here
  };

  const submitForgotPassword = async (e) => {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    if (!email) { setError("Enter your email address."); setLoading(false); return; }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setLoading(false);
    if (err) setError(err.message);
    else setNotice("Check your email for a password reset link.");
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    if (!email || !password) { setError("Enter both email and password."); setLoading(false); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (err) setError(err.message);
      else setNotice("Account created — check your email to confirm, then sign in.");
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) setError(err.message);
    }
  };

  return (
    <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4">
      <GlobalStyle />
      <div className="w-full max-w-sm">
        {onBack && (
          <button onClick={onBack} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-4 flex items-center gap-1 transition-colors">
            ← Back to home
          </button>
        )}
        <div className="flex items-center justify-center mb-8">
          <LogoFull size={34} textClass="text-xl" />
        </div>

        {mode === "forgot" ? (
          <Card className="p-6 tj-animate-in">
            <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">Reset your password</h3>
            <p className="text-xs text-[var(--text-muted)] mb-5">We'll email you a link to set a new password.</p>
            <form onSubmit={submitForgotPassword}>
              <Field label="Email">
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="email" className={`${inputCls} pl-9`} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </Field>
              {error && <p className="text-xs text-rose-400 mb-3 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
              {notice && <p className="text-xs text-emerald-400 mb-3 flex items-center gap-1"><CheckCircle size={11} /> {notice}</p>}
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">
                {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                Send Reset Link
              </button>
            </form>
            <button onClick={() => { setMode("signin"); setError(""); setNotice(""); }} className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-4 transition-colors">
              ← Back to sign in
            </button>
          </Card>
        ) : (
        <Card className="p-6 tj-animate-in">
          <div className="flex rounded-lg border border-white/10 overflow-hidden mb-5">
            <button onClick={() => { setMode("signin"); setError(""); setNotice(""); }} className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === "signin" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)]"}`}>Sign In</button>
            <button onClick={() => { setMode("signup"); setError(""); setNotice(""); }} className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === "signup" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)]"}`}>Sign Up</button>
          </div>

          <form onSubmit={submitEmail}>
            <Field label="Email">
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type="email" className={`${inputCls} pl-9`} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type={showPassword ? "text" : "password"} className={`${inputCls} pl-9 pr-9`} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>

            {mode === "signin" && (
              <button type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }} className="text-xs text-[var(--accent)] hover:text-[var(--accent)] -mt-2 mb-4 block transition-colors">
                Forgot password?
              </button>
            )}

            {error && <p className="text-xs text-rose-400 mb-3 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
            {notice && <p className="text-xs text-emerald-400 mb-3 flex items-center gap-1"><CheckCircle size={11} /> {notice}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>
        </Card>
        )}
        {mode !== "forgot" && (
          <p className="text-center text-xs text-[var(--text-faint)] mt-4">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-[var(--accent)] hover:text-[var(--accent)] font-medium">
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
        {mode === "signup" && (
          <p className="text-center text-[11px] text-[var(--text-faint)] mt-3">
            By creating an account, you agree to our{" "}
            <a href="#/terms" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline">Terms</a>{" "}
            and{" "}
            <a href="#/privacy" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline">Privacy Policy</a>.
          </p>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   ROOT APP
   ============================================================ */
const ResetPasswordScreen = ({ onDone }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) setError(err.message);
    else onDone();
  };

  return (
    <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4">
      <GlobalStyle />
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8"><LogoFull size={34} textClass="text-xl" /></div>
        <Card className="p-6 tj-animate-in">
          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">Set a new password</h3>
          <p className="text-xs text-[var(--text-muted)] mb-5">Choose a new password for your account.</p>
          <form onSubmit={submit}>
            <Field label="New Password">
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type={showPassword ? "text" : "password"} className={`${inputCls} pl-9 pr-9`} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>
            <Field label="Confirm New Password" error={error}>
              <input type={showPassword ? "text" : "password"} className={inputCls} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </Field>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 active:scale-[0.98] text-[var(--text-inverse)] font-semibold text-sm py-2.5 rounded-lg transition-all">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Update Password
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [profile, setProfile] = useState(undefined); // undefined = checking, null = needs onboarding
  const [profileFetchError, setProfileFetchError] = useState("");
  const [profileRetryKey, setProfileRetryKey] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [trades, setTrades] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [active, setActive] = useState(tabFromHash);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [settings, setSettings] = useState({ currency: "USD", timezone: "UTC", defaultRiskPct: 1, minTradingDays: 10 });
  const [viewingUserId, setViewingUserId] = useState(null);

  const [dataError, setDataError] = useState("");
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // Standalone legal pages (Privacy Policy / Terms) are accessible via
  // #/privacy and #/terms regardless of auth state, so they render before
  // any of the session/auth branching below.
  const legalFromHash = () => {
    const raw = window.location.hash.replace(/^#\/?/, "");
    if (raw === "privacy") return "privacy";
    if (raw === "terms") return "terms";
    if (raw === "changelog") return "changelog";
    return null;
  };
  const [legalPage, setLegalPage] = useState(legalFromHash);
  useEffect(() => {
    const onHashChange = () => setLegalPage(legalFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Keep the URL hash in sync with the active tab, so refreshing (or sharing
  // a link) lands back on the same page instead of resetting to dashboard.
  // Only applies once signed in — on the logged-out landing page, the hash
  // is used for anchor links (#features, #faq, etc.) instead.
  useEffect(() => {
    if (!session) return;
    if (/access_token|type=recovery|error=/.test(window.location.hash)) return;
    const target = `#/${active}`;
    if (window.location.hash !== target) window.history.pushState(null, "", target);
  }, [active, session]);

  // Support the browser's back/forward buttons switching tabs too.
  useEffect(() => {
    const onPopState = () => setActive(tabFromHash());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!session?.user) { if (session === null) setLoading(false); return; }
    setLoading(true);
    Promise.all([fetchTrades(), fetchChallenges()])
      .then(([t, c]) => { setTrades(t); setChallenges(c); setDataError(""); })
      .catch((err) => setDataError(err.message || "Failed to load your data."))
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => {
    if (!session?.user) { setProfile(session === null ? null : undefined); return; }
    fetchProfile(session.user.id)
      .then((p) => { setProfile(p); setProfileFetchError(""); })
      .catch((err) => setProfileFetchError(err.message || "Failed to load your profile."));
  }, [session, profileRetryKey]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (_event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  const addToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  const titles = {
    dashboard: ["Dashboard", "Your trading performance at a glance"],
    challenges: ["Funding Challenges", "Live rule compliance for every evaluation"],
    journal: ["Trade Journal", "Every trade, logged and filterable"],
    journaling: ["Weekly & Monthly Review", "Reflect on your trading beyond the individual trade"],
    analytics: ["Analytics & Insights", "Break down your edge by asset, day, and session"],
    goals: ["Goals", "Set targets and track your progress toward them"],
    "econ-calendar": ["Economic Calendar", "Live market-moving events"],
    heatmaps: ["Market Heatmaps", "Live stocks and crypto performance"],
    calculator: ["Pips Calculator", "Know what a pip is worth before you're in the trade"],
    forum: ["Community", "Connect with other traders"],
    leaderboard: ["Leaderboard", "Weekly and monthly rankings for opted-in traders"],
    settings: ["Settings", "Personalize Strike Journal"],
    profile: ["Profile", "How other traders see you"],
    messages: ["Messages", "Your private conversations"],
    admin: ["Admin Panel", "Manage users and moderate content"],
  };

  const addTrade = async (t) => {
    try {
      const saved = await insertTrade(t, session.user.id);
      setTrades((prev) => [saved, ...prev]);
      addToast("Trade logged successfully");
    } catch (err) { addToast(err.message || "Failed to save trade", "error"); }
  };

  const bulkImportTrades = async (parsedTrades) => {
    const saved = [];
    for (const t of parsedTrades) {
      try {
        saved.push(await insertTrade(t, session.user.id));
      } catch {
        // skip rows that fail to insert; the toast in JournalPage already reports a count
      }
    }
    if (saved.length) setTrades((prev) => [...saved, ...prev]);
    if (saved.length < parsedTrades.length) {
      addToast(`${parsedTrades.length - saved.length} row(s) failed to import`, "error");
    }
  };

  const updateTrade = async (t) => {
    try {
      const saved = await updateTradeDB(t, session.user.id);
      setTrades((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      setSelectedTrade(null);
      addToast("Trade updated");
    } catch (err) { addToast(err.message || "Failed to update trade", "error"); }
  };

  const deleteTrade = async (id) => {
    try {
      await deleteTradeDB(id);
      setTrades((prev) => prev.filter((t) => t.id !== id));
      setSelectedTrade(null);
      addToast("Trade removed", "info");
    } catch (err) { addToast(err.message || "Failed to delete trade", "error"); }
  };

  const addChallenge = async (c) => {
    try {
      const saved = await insertChallenge(c, session.user.id);
      setChallenges((prev) => [saved, ...prev]);
      addToast(`${saved.firm} challenge created`);
    } catch (err) { addToast(err.message || "Failed to create challenge", "error"); }
  };

  const deleteChallenge = async (id) => {
    try {
      await deleteChallengeDB(id);
      setChallenges((prev) => prev.filter((c) => c.id !== id));
      addToast("Challenge removed", "info");
    } catch (err) { addToast(err.message || "Failed to delete challenge", "error"); }
  };

  const markFunded = async (id) => {
    const c = challenges.find((x) => x.id === id);
    if (!c) return;
    const updated = { ...c, stage: "funded", phase: "Funded", profitSplitPct: 80, lastPayoutNetProfit: 0, payoutHistory: [] };
    try {
      const saved = await updateChallengeDB(updated, session.user.id);
      setChallenges((prev) => prev.map((x) => (x.id === id ? saved : x)));
      addToast("Challenge marked as Funded 🎉");
    } catch (err) { addToast(err.message || "Failed to update challenge", "error"); }
  };

  const requestPayout = async (id) => {
    const c = challenges.find((x) => x.id === id);
    if (!c) return;
    const s = computeChallengeStats(c, trades);
    if (s.payoutAmount <= 0) return;
    const updated = {
      ...c, lastPayoutNetProfit: s.netPnl,
      payoutHistory: [...(c.payoutHistory || []), { date: new Date().toISOString().slice(0, 10), amount: +s.payoutAmount.toFixed(2), split: c.profitSplitPct }],
    };
    try {
      const saved = await updateChallengeDB(updated, session.user.id);
      setChallenges((prev) => prev.map((x) => (x.id === id ? saved : x)));
      addToast("Payout requested");
    } catch (err) { addToast(err.message || "Failed to request payout", "error"); }
  };

  if (legalPage === "privacy") return <PrivacyPolicy />;
  if (legalPage === "terms") return <TermsOfService />;
  if (legalPage === "changelog") return <ChangelogPage />;

  if (session === undefined) {
    return (
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <GlobalStyle />
        <Loader2 size={22} className="text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (passwordRecovery) {
    return <ResetPasswordScreen onDone={() => { setPasswordRecovery(false); addToast("Password updated"); }} />;
  }

  if (!session) {
    if (!showAuth) return <LandingPage onGetStarted={() => setShowAuth(true)} onSignIn={() => setShowAuth(true)} />;
    return <AuthPage onBack={() => setShowAuth(false)} />;
  }

  if (profileFetchError && profile === undefined) {
    return (
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <GlobalStyle />
        <Card className="p-6 max-w-sm w-full text-center">
          <AlertTriangle size={22} className="text-amber-400 mx-auto mb-3" />
          <h2 className="font-bold text-[var(--text-primary)] mb-1">Couldn't load your profile</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">{profileFetchError} This doesn't mean anything was lost — just a connection hiccup.</p>
          <button onClick={() => { setProfileFetchError(""); setProfileRetryKey((k) => k + 1); }}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all">
            Try Again
          </button>
        </Card>
      </div>
    );
  }

  if (profile === undefined) {
    return (
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <GlobalStyle />
        <Loader2 size={22} className="text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (profile === null) {
    return <ProfileSetup session={session} onComplete={setProfile} />;
  }

  const isTimedOut = profile?.timeout_until && new Date(profile.timeout_until) > new Date();

  if (profile?.is_banned || isTimedOut) {
    return (
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <GlobalStyle />
        <div className="max-w-sm w-full text-center bg-white/[0.03] border border-white/10 rounded-2xl p-8">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
            <Ban size={24} className="text-rose-400" />
          </div>
          <h2 className="font-bold text-[var(--text-primary)] text-lg mb-2">
            {profile?.is_banned ? "Account Suspended" : "Temporarily Restricted"}
          </h2>
          <p className="text-sm text-[var(--text-tertiary)]">
            {profile?.is_banned
              ? "Your account has been banned by an administrator."
              : `You've been timed out until ${new Date(profile.timeout_until).toLocaleString()}.`}
          </p>
          {profile?.is_banned && profile?.ban_reason && (
            <p className="text-xs text-[var(--text-muted)] mt-2">Reason: {profile.ban_reason}</p>
          )}
          <button onClick={signOut}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-primary)] font-semibold text-sm py-2.5 rounded-lg transition-all">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <ToastContext.Provider value={addToast}>
      <div className="tj-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
        <GlobalStyle />
        <Sidebar active={active} setActive={setActive} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} user={session.user} profile={profile} onSignOut={signOut} />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar title={titles[active][0]} subtitle={titles[active][1]} onMenu={() => setMobileOpen(true)} onLogTrade={() => setLogModalOpen(true)} showLogTrade={active === "dashboard" || active === "journal"} session={session} profile={profile} setActive={setActive} />
          {dataError && (
            <div className="mx-4 md:mx-6 mt-4 flex items-center gap-2 bg-rose-950/60 border border-rose-900 text-rose-300 text-sm px-4 py-2.5 rounded-lg">
              <AlertTriangle size={14} /> Couldn't load your data: {dataError}
            </div>
          )}
          <main className="flex-1 min-w-0">
            {loading ? <LoadingScreen /> : (
              <>
                {active === "dashboard" && <DashboardPage trades={trades} challenges={challenges} onOpenTrade={setSelectedTrade} />}
                {active === "challenges" && <ChallengesPage challenges={challenges} trades={trades} onCreate={addChallenge} onDelete={deleteChallenge} onMarkFunded={markFunded} onRequestPayout={requestPayout} />}
                {active === "journal" && <JournalPage trades={trades} onDelete={deleteTrade} onOpenTrade={setSelectedTrade} onImportTrades={bulkImportTrades} profile={profile} />}
                {active === "journaling" && <JournalingPage session={session} trades={trades} toast={addToast} />}
                {active === "analytics" && <AnalyticsPage trades={trades} />}
                {active === "goals" && <GoalsPage session={session} trades={trades} toast={addToast} />}
                {active === "econ-calendar" && <EconomicCalendarPage />}
                {active === "heatmaps" && <MarketHeatmapsPage />}
                {active === "calculator" && <CalculatorPage />}
                {active === "forum" && <ForumPage session={session} profile={profile} />}
                {active === "leaderboard" && <LeaderboardPage session={session} profile={profile} onViewProfile={setViewingUserId} onGoToSettings={() => setActive("settings")} />}
                {active === "profile" && <ProfilePage session={session} profile={profile} onProfileUpdate={setProfile} toast={addToast} />}
                {active === "messages" && <MessagesPage session={session} profile={profile} />}
                {active === "settings" && <SettingsPage settings={settings} onSave={(s) => setSettings(s)} session={session} profile={profile} onProfileUpdate={setProfile} onSignOut={signOut} />}
                {active === "admin" && (profile?.is_admin
                  ? <AdminPanel session={session} profile={profile} toast={addToast} />
                  : <div className="p-6 text-sm text-[var(--text-muted)]">You don't have access to this page.</div>)}
              </>
            )}
          </main>
        </div>
        <LogTradeModal open={logModalOpen} onClose={() => setLogModalOpen(false)} onCreate={addTrade} challenges={challenges} />
        <TradeDrawer trade={selectedTrade} onClose={() => setSelectedTrade(null)} onSave={updateTrade} onDelete={deleteTrade} session={session} profile={profile} addToast={addToast} />
        <UserProfileModal userId={viewingUserId} currentUserId={session?.user?.id} currentUsername={profile?.username || "Trader"} onClose={() => setViewingUserId(null)} />
        <ToastContainer toasts={toasts} />
      </div>
    </ToastContext.Provider>
  );
}
