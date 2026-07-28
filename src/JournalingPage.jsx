import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Loader2, Star, TrendingUp, TrendingDown, Percent, Hash,
  CalendarRange, Save, CheckCircle2, Copy, Sparkles, Scale, Award, Target, Flame,
  ArrowUpRight, ArrowDownRight, Minus, Coins, CalendarCheck2,
} from "lucide-react";
import { fetchJournalEntries, upsertJournalEntry } from "./db";

const inputCls = "w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 focus:ring-1 focus:ring-[var(--accent)]/30 outline-none rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors resize-none";

const Card = ({ className = "", children }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`}>{children}</div>
);

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

  // equity curve (cumulative, ordered by date)
  const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const equityCurve = sortedTrades.map((t) => { running += (t.pnl || 0) - (t.fees || 0); return running; });

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
    topAsset, bestAsset, bestSetup, equityCurve, bestWinStreak, worstLossStreak, activeDays,
  };
}

function buildInsights(stats, prevStats, mode) {
  const insights = [];
  if (stats.tradeCount === 0) {
    insights.push("No trades logged this period yet — insights will appear once you log some.");
    return insights;
  }
  if (prevStats && prevStats.tradeCount > 0) {
    const diff = stats.netPnl - prevStats.netPnl;
    if (Math.abs(diff) > 1) {
      insights.push(`Net P&L is ${diff > 0 ? "up" : "down"} ${fmtUSD(Math.abs(diff))} vs the previous ${mode === "weekly" ? "week" : "month"}.`);
    }
    if (stats.winRate != null && prevStats.winRate != null) {
      const wrDiff = Math.round(stats.winRate - prevStats.winRate);
      if (Math.abs(wrDiff) >= 5) insights.push(`Win rate ${wrDiff > 0 ? "improved" : "dropped"} by ${Math.abs(wrDiff)} percentage points.`);
    }
  }
  if (stats.profitFactor != null && isFinite(stats.profitFactor)) {
    if (stats.profitFactor >= 2) insights.push(`Strong profit factor of ${stats.profitFactor.toFixed(2)} — winners are comfortably outweighing losers.`);
    else if (stats.profitFactor < 1) insights.push(`Profit factor is below 1.0 (${stats.profitFactor.toFixed(2)}) — losses outweighed wins this period.`);
  }
  if (stats.bestWinStreak >= 3) insights.push(`Best streak: ${stats.bestWinStreak} wins in a row.`);
  if (stats.worstLossStreak >= 3) insights.push(`Watch out: ${stats.worstLossStreak} losses in a row at one point — worth reviewing what triggered it.`);
  if (stats.bestAsset) insights.push(`Most profitable instrument: ${stats.bestAsset[0]} (${fmtSigned(stats.bestAsset[1].pnl)}).`);
  if (stats.bestSetup && stats.bestSetup[1].pnl > 0) {
    const wr = stats.bestSetup[1].closed ? Math.round((stats.bestSetup[1].wins / stats.bestSetup[1].closed) * 100) : null;
    insights.push(`"${stats.bestSetup[0]}" was your best setup${wr != null ? ` at ${wr}% win rate` : ""} (${fmtSigned(stats.bestSetup[1].pnl)}).`);
  }
  if (stats.avgWin && stats.avgLoss) {
    const ratio = Math.abs(stats.avgWin / stats.avgLoss);
    if (ratio < 1) insights.push(`Average loss (${fmtUSD(stats.avgLoss)}) is larger than average win (${fmtUSD(stats.avgWin)}) — sizing or exits may need attention.`);
  }
  return insights.slice(0, 5);
}

/* ---------- small presentational bits ---------- */
const RatingPicker = ({ value, onChange }) => (
  <div className="flex items-center gap-1.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => onChange(value === n ? null : n)}
        className="transition-transform hover:scale-110">
        <Star size={22} className={n <= (value || 0) ? "text-amber-400 fill-amber-400" : "text-[var(--text-faint)]"} />
      </button>
    ))}
  </div>
);

const Delta = ({ current, previous, higherIsBetter = true, suffix = "" }) => {
  if (previous == null || current == null || (previous === 0 && current === 0)) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return (
    <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-faint)]"><Minus size={10} /> flat</span>
  );
  const good = higherIsBetter ? diff > 0 : diff < 0;
  const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${good ? "text-emerald-400" : "text-rose-400"}`}>
      <Icon size={10} /> {Math.abs(diff).toFixed(suffix === "%" ? 0 : 0)}{suffix} vs last
    </span>
  );
};

const StatChip = ({ icon: Icon, label, value, accent, deltaEl, sub }) => (
  <div className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mb-1"><Icon size={11} /> {label}</div>
    <div className={`tj-mono text-sm font-bold ${accent || "text-[var(--text-primary)]"}`}>{value}</div>
    {sub && <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{sub}</div>}
    {deltaEl && <div className="mt-1">{deltaEl}</div>}
  </div>
);

const Sparkline = ({ points }) => {
  if (!points || points.length < 2) {
    return <div className="h-16 flex items-center justify-center text-[11px] text-[var(--text-faint)]">Not enough closed trades yet for an equity curve.</div>;
  }
  const w = 600, h = 64, pad = 4;
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const zeroY = h - pad - ((0 - min) / range) * (h - pad * 2);
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${coords[coords.length - 1][0].toFixed(1)},${zeroY} L${coords[0][0].toFixed(1)},${zeroY} Z`;
  const last = points[points.length - 1];
  const stroke = last >= 0 ? "#34d399" : "#fb7185";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
      <line x1={pad} x2={w - pad} y1={zeroY} y2={zeroY} stroke="currentColor" className="text-white/10" strokeWidth="1" strokeDasharray="3 3" />
      <path d={areaPath} fill={stroke} opacity="0.12" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function JournalingPage({ session, trades, toast }) {
  const [mode, setMode] = useState("weekly"); // "weekly" | "monthly"
  const [cursor, setCursor] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-[var(--text-muted)]">Step back from individual trades and reflect on the bigger picture, week by week and month by month.</p>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-1 w-fit">
          {["weekly", "monthly"].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors capitalize ${mode === m ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

      {/* Period navigator */}
      <Card className="p-4 flex items-center justify-between">
        <button onClick={() => shiftPeriod(-1)} className="p-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <CalendarRange size={15} className="text-[var(--text-muted)]" /> {label}
          {isCurrentPeriod && <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-full px-2 py-0.5">Current</span>}
          {existingEntry && <CheckCircle2 size={14} className="text-emerald-400" />}
        </div>
        <button onClick={() => shiftPeriod(1)} className="p-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          <ChevronRight size={16} />
        </button>
      </Card>

      {/* Auto-pulled stats for the period */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip icon={TrendingUp} label="Net P&L" value={fmtUSD(stats.netPnl)} accent={stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
          deltaEl={<Delta current={stats.netPnl} previous={prevStats.tradeCount ? prevStats.netPnl : null} />} />
        <StatChip icon={Percent} label="Win Rate" value={stats.winRate == null ? "—" : `${Math.round(stats.winRate)}%`}
          deltaEl={stats.winRate != null && prevStats.winRate != null ? <Delta current={stats.winRate} previous={prevStats.winRate} suffix="%" /> : null} />
        <StatChip icon={Hash} label="Trades Logged" value={stats.tradeCount} sub={`${stats.activeDays} active day${stats.activeDays === 1 ? "" : "s"}`} />
        <StatChip icon={Scale} label="Profit Factor" value={stats.profitFactor == null ? "—" : isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"} />
        <StatChip icon={TrendingUp} label="Avg Win" value={stats.avgWin ? fmtUSD(stats.avgWin) : "—"} accent="text-emerald-400" />
        <StatChip icon={TrendingDown} label="Avg Loss" value={stats.avgLoss ? fmtUSD(stats.avgLoss) : "—"} accent="text-rose-400" />
        <StatChip icon={Award} label="Best Day" value={stats.bestDay ? fmtUSD(stats.bestDay[1]) : "—"} accent="text-emerald-400" sub={stats.bestDay ? stats.bestDay[0] : undefined} />
        <StatChip icon={Flame} label="Worst Day" value={stats.worstDay ? fmtUSD(stats.worstDay[1]) : "—"} accent="text-rose-400" sub={stats.worstDay ? stats.worstDay[0] : undefined} />
      </div>

      {/* Equity curve for the period */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Equity Curve — {label}</h3>
          {stats.topAsset && <span className="text-[11px] text-[var(--text-faint)] flex items-center gap-1"><Coins size={11} /> Most traded: {stats.topAsset[0]} ({stats.topAsset[1].count})</span>}
        </div>
        <Sparkline points={stats.equityCurve} />
      </Card>

      {/* Auto-generated insights */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 flex items-center gap-1.5"><Sparkles size={12} className="text-[var(--accent)]" /> Insights</h3>
        <ul className="space-y-2">
          {insights.map((line, i) => (
            <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
              <Target size={13} className="text-[var(--accent)] mt-0.5 shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Reflection form */}
      <Card className="p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">How did this {mode === "weekly" ? "week" : "month"} go overall?</h3>
          <RatingPicker value={form.rating} onChange={(v) => set("rating", v)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">What went well</label>
          <textarea rows={3} className={inputCls} placeholder="Setups you executed well, discipline you kept, wins worth repeating..."
            value={form.wentWell} onChange={(e) => set("wentWell", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">What could be improved</label>
          <textarea rows={3} className={inputCls} placeholder="Mistakes, hesitation, rule breaks, emotional trades..."
            value={form.improve} onChange={(e) => set("improve", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Key lessons</label>
          <textarea rows={3} className={inputCls} placeholder="What will you take into next period?"
            value={form.lessons} onChange={(e) => set("lessons", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Goals for next {mode === "weekly" ? "week" : "month"}</label>
          <textarea rows={3} className={inputCls} placeholder={'Concrete, specific goals — not just "trade better"...'}
            value={form.goalsNext} onChange={(e) => set("goalsNext", e.target.value)} />
        </div>

        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <button onClick={save} disabled={saving}
            className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 text-[var(--text-inverse)] transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {existingEntry ? "Update Review" : "Save Review"}
          </button>
          <button onClick={copySummary}
            className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors">
            {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy Summary"}
          </button>
          {savedFlash && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={13} /> Saved</span>}
        </div>
      </Card>

      {/* Recent reviews */}
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
