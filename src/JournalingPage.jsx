import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ChevronLeft, ChevronRight, Loader2, Star, TrendingUp, Percent, Hash,
  Save, CheckCircle2, Copy, Sparkles, Scale, CalendarCheck2, LineChart as LineChartIcon,
  ShieldAlert, Repeat2, Crosshair, ClipboardList, ChevronDown, Minus, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { fetchJournalEntries, upsertJournalEntry } from "./db";
import { Card, EmptyState, CustomTooltip } from "./components/ui/Primitives";

const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors resize-none";

const fmtUSD = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtSigned = (n) => `${n > 0 ? "+" : n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/* ---------- period helpers ---------- */
function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start of week
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function weekLabel(start, end) {
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString(undefined, sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} – ${endStr}`;
}
function monthLabel(start) {
  return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function prevRange(mode, cursor) {
  const prevCursor = new Date(cursor);
  if (mode === "weekly") prevCursor.setDate(prevCursor.getDate() - 7);
  else prevCursor.setMonth(prevCursor.getMonth() - 1);
  return mode === "weekly"
    ? { start: startOfWeek(prevCursor), end: endOfWeek(prevCursor) }
    : { start: startOfMonth(prevCursor), end: endOfMonth(prevCursor) };
}

/* ---------- stats ---------- */
function computeStats(trades) {
  const closed = trades.filter((t) => t.status === "Win" || t.status === "Loss");
  const wins = closed.filter((t) => t.status === "Win");
  const losses = closed.filter((t) => t.status === "Loss");
  const netPnl = trades.reduce((s, t) => s + (t.pnl || 0) - (t.fees || 0), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : null;

  const byDay = {};
  trades.forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + (t.pnl || 0) - (t.fees || 0); });
  const dayEntries = Object.entries(byDay);
  const bestDay = dayEntries.length ? dayEntries.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
  const worstDay = dayEntries.length ? dayEntries.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;

  const grossWin = wins.reduce((s, t) => s + (t.pnl || 0), 0);
  const grossLoss = losses.reduce((s, t) => s + (t.pnl || 0), 0); // negative
  const profitFactor = grossLoss !== 0 ? Math.abs(grossWin / grossLoss) : (grossWin > 0 ? Infinity : null);
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const largestWin = wins.length ? Math.max(...wins.map((t) => t.pnl || 0)) : 0;
  const largestLoss = losses.length ? Math.min(...losses.map((t) => t.pnl || 0)) : 0;
  const expectancy = closed.length ? netPnl / closed.length : null;

  // most traded / most profitable asset
  const byAsset = {};
  trades.forEach((t) => {
    const key = t.asset || "—";
    byAsset[key] = byAsset[key] || { count: 0, pnl: 0 };
    byAsset[key].count += 1;
    byAsset[key].pnl += (t.pnl || 0) - (t.fees || 0);
  });
  const assetEntries = Object.entries(byAsset);
  const topAsset = assetEntries.length ? assetEntries.reduce((a, b) => (b[1].count > a[1].count ? b : a)) : null;
  const bestAsset = assetEntries.length ? assetEntries.reduce((a, b) => (b[1].pnl > a[1].pnl ? b : a)) : null;

  // best/worst setup
  const bySetup = {};
  trades.forEach((t) => {
    if (!t.setup) return;
    bySetup[t.setup] = bySetup[t.setup] || { count: 0, pnl: 0, wins: 0, closed: 0 };
    bySetup[t.setup].count += 1;
    bySetup[t.setup].pnl += (t.pnl || 0) - (t.fees || 0);
    if (t.status === "Win" || t.status === "Loss") {
      bySetup[t.setup].closed += 1;
      if (t.status === "Win") bySetup[t.setup].wins += 1;
    }
  });
  const setupEntries = Object.entries(bySetup);
  const bestSetup = setupEntries.length ? setupEntries.reduce((a, b) => (b[1].pnl > a[1].pnl ? b : a)) : null;

  // equity curve (cumulative, ordered by date) — kept as { date, value } pairs for charting
  const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const equityCurve = [{ date: "Start", value: 0 }];
  sortedTrades.forEach((t) => {
    running += (t.pnl || 0) - (t.fees || 0);
    equityCurve.push({ date: t.date, value: running });
  });

  // max drawdown across the period's equity curve (peak-to-trough)
  let peak = 0, maxDrawdown = 0;
  equityCurve.forEach(({ value }) => {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, value - peak);
  });

  // longest win / loss streak within the period
  let curStreak = 0, curType = null, bestWinStreak = 0, worstLossStreak = 0;
  closed.forEach((t) => {
    if (t.status === curType) curStreak += 1;
    else { curType = t.status; curStreak = 1; }
    if (t.status === "Win") bestWinStreak = Math.max(bestWinStreak, curStreak);
    else worstLossStreak = Math.max(worstLossStreak, curStreak);
  });

  const activeDays = new Set(trades.map((t) => t.date)).size;

  return {
    netPnl, winRate, tradeCount: trades.length, closedCount: closed.length, bestDay, worstDay,
    profitFactor, avgWin, avgLoss, largestWin, largestLoss, expectancy,
    topAsset, bestAsset, bestSetup, equityCurve, maxDrawdown, bestWinStreak, worstLossStreak, activeDays,
  };
}

/* insights now carry a category so the UI can group/badge them without inventing data */
function buildInsights(stats, prevStats, mode) {
  const insights = [];
  if (stats.tradeCount === 0) return insights;

  if (prevStats && prevStats.tradeCount > 0) {
    const diff = stats.netPnl - prevStats.netPnl;
    if (Math.abs(diff) > 1) {
      insights.push({ category: "Performance", text: `Net P&L is ${diff > 0 ? "up" : "down"} ${fmtUSD(Math.abs(diff))} vs the previous ${mode === "weekly" ? "week" : "month"}.` });
    }
    if (stats.winRate != null && prevStats.winRate != null) {
      const wrDiff = Math.round(stats.winRate - prevStats.winRate);
      if (Math.abs(wrDiff) >= 5) insights.push({ category: "Performance", text: `Win rate ${wrDiff > 0 ? "improved" : "dropped"} by ${Math.abs(wrDiff)} percentage points.` });
    }
  }
  if (stats.profitFactor != null && isFinite(stats.profitFactor)) {
    if (stats.profitFactor >= 2) insights.push({ category: "Performance", text: `Strong profit factor of ${stats.profitFactor.toFixed(2)} — winners are comfortably outweighing losers.` });
    else if (stats.profitFactor < 1) insights.push({ category: "Risk", text: `Profit factor is below 1.0 (${stats.profitFactor.toFixed(2)}) — losses outweighed wins this period.` });
  }
  if (stats.bestWinStreak >= 3) insights.push({ category: "Consistency", text: `Best streak: ${stats.bestWinStreak} wins in a row.` });
  if (stats.worstLossStreak >= 3) insights.push({ category: "Risk", text: `${stats.worstLossStreak} losses in a row at one point — worth reviewing what triggered it.` });
  if (stats.bestAsset) insights.push({ category: "Performance", text: `Most profitable instrument: ${stats.bestAsset[0]} (${fmtSigned(stats.bestAsset[1].pnl)}).` });
  if (stats.bestSetup && stats.bestSetup[1].pnl > 0) {
    const wr = stats.bestSetup[1].closed ? Math.round((stats.bestSetup[1].wins / stats.bestSetup[1].closed) * 100) : null;
    insights.push({ category: "Execution", text: `"${stats.bestSetup[0]}" was your best setup${wr != null ? ` at ${wr}% win rate` : ""} (${fmtSigned(stats.bestSetup[1].pnl)}).` });
  }
  if (stats.avgWin && stats.avgLoss) {
    const ratio = Math.abs(stats.avgWin / stats.avgLoss);
    if (ratio < 1) insights.push({ category: "Risk", text: `Average loss (${fmtUSD(stats.avgLoss)}) is larger than average win (${fmtUSD(stats.avgWin)}) — sizing or exits may need attention.` });
  }
  if (stats.worstDay && stats.netPnl < 0) {
    const share = Math.abs(stats.worstDay[1] / stats.netPnl) * 100;
    if (isFinite(share) && share >= 30) insights.push({ category: "Risk", text: `Your worst day accounted for ${Math.round(share)}% of the period's net loss.` });
  }
  insights.push({ category: "Consistency", text: `You logged trades on ${stats.activeDays} day${stats.activeDays === 1 ? "" : "s"} this ${mode === "weekly" ? "week" : "month"}.` });
  return insights.slice(0, 6);
}

/* derive a plain-language status line strictly from existing stats — never fabricated */
function buildStatus(stats, prevStats, mode) {
  const periodWord = mode === "weekly" ? "week" : "month";
  if (stats.tradeCount === 0) return { tone: "muted", title: "Not enough data yet", sub: `Log a trade this ${periodWord} to start your review.` };
  if (prevStats && prevStats.tradeCount > 0) {
    const diff = stats.netPnl - prevStats.netPnl;
    if (stats.netPnl > 0 && diff >= 0) return { tone: "good", title: "Strong period", sub: `Net P&L is above your previous ${periodWord}.` };
    if (stats.netPnl <= 0 && diff < 0) return { tone: "bad", title: "Needs attention", sub: `Net P&L is below your previous ${periodWord}.` };
    return { tone: "neutral", title: stats.netPnl >= 0 ? "Profitable period" : "Losing period", sub: `Performance shifted vs your previous ${periodWord}.` };
  }
  return stats.netPnl >= 0
    ? { tone: "good", title: "Profitable period", sub: "No prior period to compare against yet." }
    : { tone: "bad", title: "Losing period", sub: "No prior period to compare against yet." };
}

const STATUS_DOT = { good: "bg-emerald-400", bad: "bg-rose-400", neutral: "bg-amber-400", muted: "bg-[var(--text-faint)]" };

const CATEGORY_ICON = { Performance: TrendingUp, Risk: ShieldAlert, Consistency: Repeat2, Execution: Crosshair };
const CATEGORY_COLOR = {
  Performance: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  Risk: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  Consistency: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Execution: "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

/* ---------- small presentational bits ---------- */
const RatingPicker = ({ value, onChange }) => (
  <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rate this period from 1 to 5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n === 1 ? "" : "s"}`}
        onClick={() => onChange(value === n ? null : n)}
        className="transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 rounded">
        <Star size={22} className={n <= (value || 0) ? "text-amber-400 fill-amber-400" : "text-[var(--text-faint)]"} />
      </button>
    ))}
  </div>
);

const Delta = ({ current, previous, higherIsBetter = true, suffix = "" }) => {
  if (previous == null || current == null || (previous === 0 && current === 0)) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return (
    <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-faint)]"><Minus size={10} /> flat vs last</span>
  );
  const good = higherIsBetter ? diff > 0 : diff < 0;
  const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${good ? "text-emerald-400" : "text-rose-400"}`}>
      <Icon size={10} /> {Math.abs(diff).toFixed(0)}{suffix} vs last
    </span>
  );
};

/* Primary metric — the dominant figure on the page (Net P&L) */
const PrimaryMetric = ({ label, value, accent, deltaEl }) => (
  <div className="flex flex-col">
    <span className="text-[11px] font-medium text-[var(--text-muted)] tracking-wide">{label}</span>
    <span className={`tj-mono text-[34px] md:text-[40px] font-bold leading-tight mt-1 ${accent}`}>{value}</span>
    {deltaEl && <div className="mt-1.5">{deltaEl}</div>}
  </div>
);

/* Secondary metric — one tier down, still emphasized */
const SecondaryMetric = ({ icon: Icon, label, value, accent, deltaEl, sub }) => (
  <div className="flex-1 min-w-[110px] border-l border-white/[0.06] pl-4 first:border-l-0 first:pl-0">
    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mb-1"><Icon size={12} /> {label}</div>
    <div className={`tj-mono text-xl font-bold ${accent || "text-[var(--text-primary)]"}`}>{value}</div>
    {sub && <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{sub}</div>}
    {deltaEl && <div className="mt-1">{deltaEl}</div>}
  </div>
);

/* Tertiary metric — quiet, small, scanning-only */
const TertiaryMetric = ({ label, value, accent, sub }) => (
  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5">
    <div className="text-[10px] font-medium text-[var(--text-faint)] mb-1">{label}</div>
    <div className={`tj-mono text-[13px] font-semibold ${accent || "text-[var(--text-secondary)]"}`}>{value}</div>
    {sub && <div className="text-[10px] text-[var(--text-faint)] mt-0.5 truncate">{sub}</div>}
  </div>
);

const WORKFLOW_STEPS = [
  { n: "01", label: "Performance", desc: "Review your numbers" },
  { n: "02", label: "Behavior", desc: "Understand your decisions" },
  { n: "03", label: "Insights", desc: "Identify patterns" },
  { n: "04", label: "Reflection", desc: "Record what you learned" },
  { n: "05", label: "Next period", desc: "Define what to improve" },
];

const ReviewWorkflow = () => (
  <div className="hidden md:flex items-stretch gap-0 text-left" aria-hidden="true">
    {WORKFLOW_STEPS.map((s, i) => (
      <React.Fragment key={s.n}>
        <div className="flex items-center gap-2 py-1">
          <span className="tj-mono text-[11px] font-semibold text-[var(--text-faint)]">{s.n}</span>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold text-[var(--text-tertiary)]">{s.label}</div>
            <div className="text-[10px] text-[var(--text-faint)]">{s.desc}</div>
          </div>
        </div>
        {i < WORKFLOW_STEPS.length - 1 && <div className="w-6 self-center h-px bg-white/10 mx-2" />}
      </React.Fragment>
    ))}
  </div>
);

export default function JournalingPage({ session, trades, toast }) {
  const [mode, setMode] = useState("weekly"); // "weekly" | "monthly"
  const [cursor, setCursor] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(true);

  const [form, setForm] = useState({ rating: null, wentWell: "", improve: "", lessons: "", goalsNext: "" });

  const notify = (msg, type) => (toast ? toast(msg, type) : undefined);

  const load = useCallback(() => {
    setLoading(true);
    fetchJournalEntries(session.user.id)
      .then(setEntries)
      .catch((err) => setError(err.message || "Failed to load journal entries."))
      .finally(() => setLoading(false));
  }, [session.user.id]);

  useEffect(() => { load(); }, [load]);

  const range = useMemo(() => {
    if (mode === "weekly") return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    return { start: startOfMonth(cursor), end: endOfMonth(cursor) };
  }, [mode, cursor]);

  const periodStart = toISO(range.start);
  const label = mode === "weekly" ? weekLabel(range.start, range.end) : monthLabel(range.start);
  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    return now >= range.start && now <= range.end;
  }, [range]);
  const isFuturePeriod = range.start > new Date();

  const filterByRange = useCallback((r) => {
    const startTime = r.start.getTime(), endTime = r.end.getTime();
    return trades.filter((t) => {
      const tm = new Date(t.date).getTime();
      return tm >= startTime && tm <= endTime;
    });
  }, [trades]);

  const periodTrades = useMemo(() => filterByRange(range), [filterByRange, range]);
  const stats = useMemo(() => computeStats(periodTrades), [periodTrades]);

  const previousRange = useMemo(() => prevRange(mode, cursor), [mode, cursor]);
  const previousTrades = useMemo(() => filterByRange(previousRange), [filterByRange, previousRange]);
  const prevStats = useMemo(() => computeStats(previousTrades), [previousTrades]);

  const insights = useMemo(() => buildInsights(stats, prevStats, mode), [stats, prevStats, mode]);
  const status = useMemo(() => buildStatus(stats, prevStats, mode), [stats, prevStats, mode]);

  const existingEntry = entries.find((e) => e.periodType === mode && e.periodStart === periodStart);

  useEffect(() => {
    if (existingEntry) {
      setForm({ rating: existingEntry.rating, wentWell: existingEntry.wentWell, improve: existingEntry.improve, lessons: existingEntry.lessons, goalsNext: existingEntry.goalsNext });
    } else {
      setForm({ rating: null, wentWell: "", improve: "", lessons: "", goalsNext: "" });
    }
  }, [mode, periodStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const saved = await upsertJournalEntry({ periodType: mode, periodStart, ...form }, session.user.id);
      setEntries((prev) => {
        const others = prev.filter((e) => !(e.periodType === mode && e.periodStart === periodStart));
        return [saved, ...others];
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      notify(`${mode === "weekly" ? "Weekly" : "Monthly"} review saved`);
    } catch (err) {
      setError(err.message || "Failed to save review.");
      notify(err.message || "Failed to save review.", "error");
    } finally {
      setSaving(false);
    }
  };

  const shiftPeriod = (dir) => {
    setCursor((c) => {
      const next = new Date(c);
      if (mode === "weekly") next.setDate(next.getDate() + dir * 7);
      else next.setMonth(next.getMonth() + dir);
      return next;
    });
  };

  const copySummary = async () => {
    const lines = [
      `${mode === "weekly" ? "Weekly" : "Monthly"} Review — ${label}`,
      `Net P&L: ${fmtSigned(stats.netPnl)}`,
      `Win rate: ${stats.winRate == null ? "—" : `${Math.round(stats.winRate)}%`} (${stats.closedCount} closed trades)`,
      stats.profitFactor != null ? `Profit factor: ${isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"}` : null,
      stats.bestDay ? `Best day: ${stats.bestDay[0]} (${fmtSigned(stats.bestDay[1])})` : null,
      stats.worstDay ? `Worst day: ${stats.worstDay[0]} (${fmtSigned(stats.worstDay[1])})` : null,
      form.rating ? `Self-rating: ${form.rating}/5` : null,
      form.wentWell ? `\nWhat went well:\n${form.wentWell}` : null,
      form.improve ? `\nWhat could improve:\n${form.improve}` : null,
      form.lessons ? `\nKey lessons:\n${form.lessons}` : null,
      form.goalsNext ? `\nGoals for next ${mode === "weekly" ? "week" : "month"}:\n${form.goalsNext}` : null,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notify("Summary copied to clipboard");
    } catch {
      notify("Couldn't copy — your browser may be blocking clipboard access.", "error");
    }
  };

  const recentEntries = entries.filter((e) => e.periodType === mode).slice(0, 8);
  const recentWithPnl = useMemo(() => recentEntries.map((e) => {
    const start = new Date(e.periodStart + "T00:00:00");
    const r = mode === "weekly" ? { start, end: endOfWeek(start) } : { start, end: endOfMonth(start) };
    const t = filterByRange(r);
    return { entry: e, start, netPnl: t.reduce((s, x) => s + (x.pnl || 0) - (x.fees || 0), 0) };
  }), [recentEntries, mode, filterByRange]);

  const hasEquity = stats.equityCurve.length > 1;
  const periodEnd = hasEquity ? stats.equityCurve[stats.equityCurve.length - 1].value : 0;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl">
      {/* ---------- Header: intro + mode toggle ---------- */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <p className="text-sm text-[var(--text-muted)] max-w-md leading-relaxed">
          Step back from individual trades and understand the bigger picture — reviewed top to bottom, {mode === "weekly" ? "week" : "month"} by {mode === "weekly" ? "week" : "month"}.
        </p>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-1 w-fit">
          {["weekly", "monthly"].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors capitalize ${mode === m ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* subtle review-workflow strip — desktop only, purely orienting */}
      <ReviewWorkflow />

      {error && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

      {/* ---------- Period navigator ---------- */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => shiftPeriod(-1)} aria-label="Previous period"
          className="p-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col items-center min-w-[220px]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            {label}
            {existingEntry && <CheckCircle2 size={13} className="text-emerald-400" aria-label="Review saved" />}
          </div>
          {isCurrentPeriod ? (
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)] mt-0.5">Current {mode === "weekly" ? "week" : "month"}</span>
          ) : (
            <span className="text-[10px] text-[var(--text-faint)] mt-0.5">&nbsp;</span>
          )}
        </div>
        <button onClick={() => shiftPeriod(1)} disabled={isFuturePeriod} aria-label="Next period"
          className="p-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ---------- Performance summary ---------- */}
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <PrimaryMetric
            label="Net P&L"
            value={fmtSigned(stats.netPnl)}
            accent={stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
            deltaEl={<Delta current={stats.netPnl} previous={prevStats.tradeCount ? prevStats.netPnl : null} />}
          />
          <div className="flex items-center gap-2 lg:pt-1">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status.tone]}`} />
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{status.title}</div>
              <div className="text-xs text-[var(--text-muted)]">{status.sub}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-4 mt-5 pt-5 border-t border-white/[0.06]">
          <SecondaryMetric icon={Percent} label="Win Rate" value={stats.winRate == null ? "—" : `${Math.round(stats.winRate)}%`}
            deltaEl={stats.winRate != null && prevStats.winRate != null ? <Delta current={stats.winRate} previous={prevStats.winRate} suffix="%" /> : null} />
          <SecondaryMetric icon={Scale} label="Profit Factor" value={stats.profitFactor == null ? "—" : isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"} />
          <SecondaryMetric icon={Hash} label="Trades" value={stats.tradeCount} sub={`${stats.activeDays} active day${stats.activeDays === 1 ? "" : "s"}`} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <TertiaryMetric label="Avg Win" value={stats.avgWin ? fmtUSD(stats.avgWin) : "—"} accent="text-emerald-400" />
          <TertiaryMetric label="Avg Loss" value={stats.avgLoss ? fmtUSD(stats.avgLoss) : "—"} accent="text-rose-400" />
          <TertiaryMetric label="Best Day" value={stats.bestDay ? fmtUSD(stats.bestDay[1]) : "—"} accent="text-emerald-400" sub={stats.bestDay ? stats.bestDay[0] : undefined} />
          <TertiaryMetric label="Worst Day" value={stats.worstDay ? fmtUSD(stats.worstDay[1]) : "—"} accent="text-rose-400" sub={stats.worstDay ? stats.worstDay[0] : undefined} />
        </div>
      </Card>

      {/* ---------- Equity curve + period context ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Equity Curve</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Account progression during this period</p>
            </div>
            {stats.topAsset && <span className="hidden sm:flex text-[11px] text-[var(--text-faint)] items-center gap-1">Most traded: {stats.topAsset[0]} ({stats.topAsset[1].count})</span>}
          </div>

          {hasEquity ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.equityCurve} margin={{ left: 0, right: 8, top: 16, bottom: 0 }}>
                <defs>
                  <linearGradient id="reviewEquityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${v}`} />
                <ReferenceLine y={0} stroke="var(--border-secondary)" strokeDasharray="3 3" />
                <Tooltip content={<CustomTooltip prefix="$" />} />
                <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="url(#reviewEquityGradient)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={LineChartIcon} title="No trading data yet"
              sub={`Log your first trade for this ${mode === "weekly" ? "week" : "month"} to see your equity curve, statistics, and performance insights.`} />
          )}
        </Card>

        <Card className="p-5 flex flex-col justify-center gap-4">
          <div>
            <div className="text-[11px] text-[var(--text-muted)]">Period P&L</div>
            <div className={`tj-mono text-lg font-bold ${stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtSigned(stats.netPnl)}</div>
          </div>
          <div className="h-px bg-white/[0.06]" />
          <div>
            <div className="text-[11px] text-[var(--text-muted)]">Period End (cumulative)</div>
            <div className="tj-mono text-lg font-bold text-[var(--text-primary)]">{fmtSigned(periodEnd)}</div>
          </div>
          <div className="h-px bg-white/[0.06]" />
          <div>
            <div className="text-[11px] text-[var(--text-muted)]">Max Drawdown</div>
            <div className="tj-mono text-lg font-bold text-rose-400">{hasEquity ? fmtUSD(stats.maxDrawdown) : "—"}</div>
          </div>
        </Card>
      </div>

      {/* ---------- Insights + Trader review ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5"><Sparkles size={14} className="text-[var(--accent)]" /> Performance Insights</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-4">Patterns pulled directly from this period's trades.</p>

          {insights.length === 0 ? (
            <EmptyState icon={Sparkles} title="No insights yet"
              sub="Insights appear automatically once you've logged trades for this period." />
          ) : (
            <ul className="space-y-2.5">
              {insights.map((ins, i) => {
                const Icon = CATEGORY_ICON[ins.category] || Sparkles;
                return (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border ${CATEGORY_COLOR[ins.category] || "text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/20"}`}>
                      <Icon size={11} />
                    </span>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">{ins.category}</span>
                      <p className="text-sm text-[var(--text-secondary)] leading-snug">{ins.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <button onClick={() => setReviewOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 text-left focus:outline-none">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5"><ClipboardList size={14} className="text-[var(--accent)]" /> How did you trade?</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Rate your execution and reflect on your process.</p>
            </div>
            <ChevronDown size={16} className={`text-[var(--text-muted)] shrink-0 transition-transform ${reviewOpen ? "rotate-180" : ""}`} />
          </button>

          {reviewOpen && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between flex-wrap gap-2 bg-white/[0.02] border border-white/[0.06] rounded-lg px-3.5 py-2.5">
                <span className="text-xs font-medium text-[var(--text-tertiary)]">Self-rating for this {mode === "weekly" ? "week" : "month"}</span>
                <RatingPicker value={form.rating} onChange={(v) => set("rating", v)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">What went well</label>
                <textarea rows={2} className={inputCls} placeholder="Setups you executed well, discipline you kept, wins worth repeating..."
                  value={form.wentWell} onChange={(e) => set("wentWell", e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">What could be improved</label>
                <textarea rows={2} className={inputCls} placeholder="Mistakes, hesitation, rule breaks, emotional trades..."
                  value={form.improve} onChange={(e) => set("improve", e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Key lessons</label>
                <textarea rows={2} className={inputCls} placeholder="What will you take into next period?"
                  value={form.lessons} onChange={(e) => set("lessons", e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Goals for next {mode === "weekly" ? "week" : "month"}</label>
                <textarea rows={2} className={inputCls} placeholder={'Concrete, specific goals — not just "trade better"...'}
                  value={form.goalsNext} onChange={(e) => set("goalsNext", e.target.value)} />
              </div>

              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <button onClick={save} disabled={saving}
                  className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--text-inverse)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {existingEntry ? "Update Review" : "Save Review"}
                </button>
                <button onClick={copySummary}
                  className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                  {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy Summary"}
                </button>
                {savedFlash && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={13} /> Saved</span>}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ---------- Recent reviews ---------- */}
      {!loading && recentWithPnl.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 flex items-center gap-1.5"><CalendarCheck2 size={12} /> Past {mode === "weekly" ? "Weekly" : "Monthly"} Reviews</h3>
          <div className="space-y-1.5">
            {recentWithPnl.map(({ entry: e, start, netPnl }) => {
              const entryLabel = mode === "weekly" ? weekLabel(start, endOfWeek(start)) : monthLabel(start);
              const isCurrent = e.periodStart === periodStart;
              return (
                <button key={e.id} onClick={() => setCursor(start)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isCurrent ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "hover:bg-white/[0.04] text-[var(--text-secondary)]"
                  }`}>
                  <span className="text-sm">{entryLabel}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`tj-mono text-[11px] font-semibold ${netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtSigned(netPnl)}</span>
                    {e.rating && (
                      <span className="flex items-center gap-0.5 text-amber-400 text-xs">
                        <Star size={11} className="fill-amber-400" /> {e.rating}
                      </span>
                    )}
                    <span className="text-[11px] text-[var(--text-faint)]">{new Date(e.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-10"><Loader2 size={20} className="text-[var(--accent)] animate-spin" /></div>
      )}
    </div>
  );
}
