import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, Star, TrendingUp, TrendingDown, Percent, Hash, CalendarRange, Save, CheckCircle2 } from "lucide-react";
import { fetchJournalEntries, upsertJournalEntry } from "./db";

const inputCls = "w-full bg-zinc-950 border border-white/10 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 outline-none rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition-colors resize-none";

const Card = ({ className = "", children }) => (
  <div className={`bg-white/[0.03] border border-white/10 backdrop-blur-sm rounded-xl ${className}`}>{children}</div>
);

const fmtUSD = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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

function computeStats(trades) {
  const closed = trades.filter((t) => t.status === "Win" || t.status === "Loss");
  const netPnl = trades.reduce((s, t) => s + (t.pnl || 0) - (t.fees || 0), 0);
  const winRate = closed.length ? (closed.filter((t) => t.status === "Win").length / closed.length) * 100 : null;
  const byDay = {};
  trades.forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + (t.pnl || 0) - (t.fees || 0); });
  const dayEntries = Object.entries(byDay);
  const bestDay = dayEntries.length ? dayEntries.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
  const worstDay = dayEntries.length ? dayEntries.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;
  return { netPnl, winRate, tradeCount: trades.length, closedCount: closed.length, bestDay, worstDay };
}

const RatingPicker = ({ value, onChange }) => (
  <div className="flex items-center gap-1.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => onChange(value === n ? null : n)}
        className="transition-transform hover:scale-110">
        <Star size={22} className={n <= (value || 0) ? "text-amber-400 fill-amber-400" : "text-zinc-700"} />
      </button>
    ))}
  </div>
);

const StatChip = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1"><Icon size={11} /> {label}</div>
    <div className={`tj-mono text-sm font-bold ${accent || "text-zinc-200"}`}>{value}</div>
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

  const periodTrades = useMemo(() => {
    const startTime = range.start.getTime(), endTime = range.end.getTime();
    return trades.filter((t) => {
      const tm = new Date(t.date).getTime();
      return tm >= startTime && tm <= endTime;
    });
  }, [trades, range]);

  const stats = useMemo(() => computeStats(periodTrades), [periodTrades]);

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

  const recentEntries = entries.filter((e) => e.periodType === mode).slice(0, 8);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-zinc-500">Step back from individual trades and reflect on the bigger picture, week by week and month by month.</p>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-1 w-fit">
          {["weekly", "monthly"].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors capitalize ${mode === m ? "bg-blue-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

      {/* Period navigator */}
      <Card className="p-4 flex items-center justify-between">
        <button onClick={() => shiftPeriod(-1)} className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-100 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <CalendarRange size={15} className="text-zinc-500" /> {label}
          {existingEntry && <CheckCircle2 size={14} className="text-emerald-400" />}
        </div>
        <button onClick={() => shiftPeriod(1)} className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-100 transition-colors">
          <ChevronRight size={16} />
        </button>
      </Card>

      {/* Auto-pulled stats for the period */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip icon={TrendingUp} label="Net P&L" value={fmtUSD(stats.netPnl)} accent={stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"} />
        <StatChip icon={Percent} label="Win Rate" value={stats.winRate == null ? "—" : `${Math.round(stats.winRate)}%`} />
        <StatChip icon={Hash} label="Trades Logged" value={stats.tradeCount} />
        <StatChip icon={stats.bestDay && stats.bestDay[1] < 0 ? TrendingDown : TrendingUp} label="Best Day" value={stats.bestDay ? fmtUSD(stats.bestDay[1]) : "—"} accent="text-emerald-400" />
      </div>

      {/* Reflection form */}
      <Card className="p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-zinc-100">How did this {mode === "weekly" ? "week" : "month"} go overall?</h3>
          <RatingPicker value={form.rating} onChange={(v) => set("rating", v)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">What went well</label>
          <textarea rows={3} className={inputCls} placeholder="Setups you executed well, discipline you kept, wins worth repeating..."
            value={form.wentWell} onChange={(e) => set("wentWell", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">What could be improved</label>
          <textarea rows={3} className={inputCls} placeholder="Mistakes, hesitation, rule breaks, emotional trades..."
            value={form.improve} onChange={(e) => set("improve", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Key lessons</label>
          <textarea rows={3} className={inputCls} placeholder="What will you take into next period?"
            value={form.lessons} onChange={(e) => set("lessons", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Goals for next {mode === "weekly" ? "week" : "month"}</label>
          <textarea rows={3} className={inputCls} placeholder={'Concrete, specific goals — not just "trade better"...'}
            value={form.goalsNext} onChange={(e) => set("goalsNext", e.target.value)} />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button onClick={save} disabled={saving}
            className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-zinc-950 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {existingEntry ? "Update Review" : "Save Review"}
          </button>
          {savedFlash && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={13} /> Saved</span>}
        </div>
      </Card>

      {/* Recent reviews */}
      {!loading && recentEntries.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Past {mode === "weekly" ? "Weekly" : "Monthly"} Reviews</h3>
          <div className="space-y-1.5">
            {recentEntries.map((e) => {
              const start = new Date(e.periodStart + "T00:00:00");
              const entryLabel = mode === "weekly" ? weekLabel(start, endOfWeek(start)) : monthLabel(start);
              const isCurrent = e.periodStart === periodStart;
              return (
                <button key={e.id} onClick={() => setCursor(start)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isCurrent ? "bg-blue-500/10 text-blue-300" : "hover:bg-white/[0.04] text-zinc-300"
                  }`}>
                  <span className="text-sm">{entryLabel}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.rating && (
                      <span className="flex items-center gap-0.5 text-amber-400 text-xs">
                        <Star size={11} className="fill-amber-400" /> {e.rating}
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-600">{new Date(e.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-10"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
      )}
    </div>
  );
}
