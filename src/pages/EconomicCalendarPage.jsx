import React, { useState, useEffect, useMemo } from "react";
import { Filter, CalendarClock, RefreshCw } from "lucide-react";
import { IMPACT_LEVELS } from "../constants";
import { Card } from "../components/ui/Primitives";
import { fetchEconomicEvents } from "../db";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY"];
const RANGES = ["Yesterday", "Today", "Tomorrow", "This Week"];

const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Mon-Sun dates for the week containing `d`.
function weekDates(d) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

// Start/end bounds (inclusive) for each relative range chip, computed
// fresh against "today" rather than the currently-selected day — these
// are fixed calendar concepts (This Week always means the week
// containing today), not something that shifts as you browse.
function rangeBounds(range, today) {
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  if (range === "Yesterday") { const d = new Date(today); d.setDate(d.getDate() - 1); return [startOfDay(d), endOfDay(d)]; }
  if (range === "Today") return [startOfDay(today), endOfDay(today)];
  if (range === "Tomorrow") { const d = new Date(today); d.setDate(d.getDate() + 1); return [startOfDay(d), endOfDay(d)]; }
  if (range === "This Week") { const w = weekDates(today); return [startOfDay(w[0]), endOfDay(w[6])]; }
  return [startOfDay(today), endOfDay(today)];
}

const FLAG = { USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", AUD: "🇦🇺", CAD: "🇨🇦", CHF: "🇨🇭", NZD: "🇳🇿", CNY: "🇨🇳" };

const IMPACT_ROW_BORDER = { High: "border-l-rose-500", Medium: "border-l-amber-400", Low: "border-l-emerald-500", Holiday: "border-l-white/20" };

// Forex Factory's raw feed uses "High"/"Medium"/"Low"/"Holiday" already,
// but normalize defensively in case of casing differences across their
// own feed revisions — nothing here should hard-fail on an unexpected value.
function normalizeImpact(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("high")) return "High";
  if (s.includes("med")) return "Medium";
  if (s.includes("low")) return "Low";
  return "Holiday";
}

export const EconomicCalendarPage = () => {
  const [now, setNow] = useState(new Date());
  // "today" for range-chip math must track the same clock as `now` — two
  // separate date sources that don't both tick was the actual bug here:
  // "today" used to be captured once at mount and never updated, so
  // Today/Yesterday/Tomorrow/This Week would silently go stale for anyone
  // who left the tab open across midnight.
  const today = now;
  const [selectedRange, setSelectedRange] = useState("Today");

  const [impacts, setImpacts] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("econCalendar.impacts")); return Array.isArray(saved) ? saved : ["High", "Medium", "Low", "Holiday"]; }
    catch { return ["High", "Medium", "Low", "Holiday"]; }
  });
  const [currencies, setCurrencies] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("econCalendar.currencies")); return Array.isArray(saved) ? saved : CURRENCIES; }
    catch { return CURRENCIES; }
  });
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [showPassed, setShowPassed] = useState(() => {
    try { return localStorage.getItem("econCalendar.showPassed") !== "false"; } catch { return true; }
  });

  useEffect(() => { try { localStorage.setItem("econCalendar.impacts", JSON.stringify(impacts)); } catch {} }, [impacts]);
  useEffect(() => { try { localStorage.setItem("econCalendar.currencies", JSON.stringify(currencies)); } catch {} }, [currencies]);
  useEffect(() => { try { localStorage.setItem("econCalendar.showPassed", String(showPassed)); } catch {} }, [showPassed]);

  const toggleImpact = (v) => setImpacts((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleCurrency = (c) => setCurrencies((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const allCurrenciesSelected = currencies.length === CURRENCIES.length;
  const toggleAllCurrencies = () => setCurrencies(allCurrenciesSelected ? [] : [...CURRENCIES]);

  const [rawEvents, setRawEvents] = useState([]);
  const [failedUrls, setFailedUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const loadEvents = () => {
    fetchEconomicEvents()
      .then(({ events, failedUrls }) => { setRawEvents(events); setFailedUrls(failedUrls); })
      .catch((err) => setError(err.message || "Failed to load the economic calendar."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    loadEvents();
    // Refetch periodically so newly-published data (e.g. an "actual" value
    // appearing shortly after a release) shows up without a manual reload.
    // The edge function's own cache (3 min) means this doesn't hit Forex
    // Factory any more often than every ~3 minutes regardless of this
    // interval, so polling every 2 min here keeps the client close behind
    // the cache without adding real upstream load.
    const id = setInterval(loadEvents, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);



  // Normalize Forex Factory's raw event shape once, rather than repeating
  // the same field access/parsing on every filter re-run. Also dedupes by
  // content (country+date+title) — Forex Factory's own feed occasionally
  // repeats a row (e.g. across a revision), and this collapses that rather
  // than rendering the same event twice.
  const events = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const e of rawEvents) {
      const key = `${e.country}|${e.date}|${e.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: key,
        title: e.title || "Untitled event",
        country: (e.country || "").toUpperCase(),
        date: new Date(e.date),
        impact: normalizeImpact(e.impact),
        forecast: e.forecast || "",
        previous: e.previous || "",
        actual: e.actual || "",
      });
    }
    return out;
  }, [rawEvents]);

  const dayEvents = useMemo(() => {
    const [start, end] = rangeBounds(selectedRange, today);
    return events
      .filter((e) => e.date >= start && e.date <= end)
      .filter((e) => impacts.includes(e.impact))
      .filter((e) => currencies.includes(e.country))
      .filter((e) => showPassed || e.date > now)
      .sort((a, b) => a.date - b.date);
  }, [events, selectedRange, today, impacts, currencies, showPassed, now]);

  const fmtDate = (d) => d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  const fmtTime = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="p-4 md:p-6">
      <Card className="p-4 md:p-5 !bg-black !border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock size={16} className="text-[var(--accent)]" />
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Economic Calendar</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">Live economic events, sourced from Forex Factory's public calendar feed — rate decisions, CPI, NFP, and more that can move the markets you trade.</p>

        {error && <div className="mb-4 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">{error}</div>}

        {/* Range chips */}
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto tj-scrollbar pb-1">
          {RANGES.map((r) => {
            const isSelected = r === selectedRange;
            return (
              <button key={r} onClick={() => setSelectedRange(r)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  isSelected ? "bg-transparent border-[var(--accent)] text-[var(--accent)]" : "bg-white/[0.04] border-transparent text-[var(--text-secondary)] hover:bg-white/[0.07]"
                }`}>
                {r}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-white/10">
          {IMPACT_LEVELS.map((lvl) => {
            const on = impacts.includes(lvl.value);
            return (
              <button key={lvl.value} onClick={() => toggleImpact(lvl.value)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${on ? lvl.active : "bg-transparent border-white/15 text-[var(--text-faint)] hover:border-white/25 hover:text-[var(--text-muted)]"}`}>
                {lvl.label}
              </button>
            );
          })}
          <button onClick={() => toggleImpact("Holiday")}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${impacts.includes("Holiday") ? "bg-white/10 border-white/40 text-[var(--text-primary)]" : "bg-transparent border-white/15 text-[var(--text-faint)] hover:border-white/25 hover:text-[var(--text-muted)]"}`}>
            No Impact
          </button>

          <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

          <div className="relative">
            <button onClick={() => setCurrencyMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-transparent text-xs font-semibold text-[var(--text-secondary)] hover:border-white/25 hover:text-[var(--text-primary)] transition-colors">
              <Filter size={12} /> Currencies {allCurrenciesSelected ? "(All)" : `(${currencies.length})`}
            </button>
            {currencyMenuOpen && (
              <div className="absolute z-30 mt-2 w-48 bg-[var(--bg-primary)] border border-white/10 rounded-lg shadow-2xl p-2 tj-animate-in">
                <button onClick={toggleAllCurrencies} className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-[var(--accent)] hover:bg-white/5 transition-colors mb-1">
                  {allCurrenciesSelected ? "Clear all" : "Select all"}
                </button>
                <div className="max-h-56 overflow-y-auto tj-scrollbar space-y-0.5">
                  {CURRENCIES.map((c) => (
                    <label key={c} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-white/5 cursor-pointer transition-colors">
                      <input type="checkbox" checked={currencies.includes(c)} onChange={() => toggleCurrency(c)} className="accent-blue-500" />
                      {FLAG[c]} {c}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 ml-auto cursor-pointer select-none">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Show Passed Events</span>
            <button type="button" onClick={() => setShowPassed((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${showPassed ? "bg-[var(--accent)]" : "bg-white/15"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showPassed ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </label>
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden border border-white/10">
          <div className="hidden sm:grid grid-cols-[80px_100px_1fr_90px_90px_90px_110px] gap-2 px-3 py-2 bg-white/[0.03] text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            <span>{selectedRange === "This Week" ? "Date / Time" : "Time"}</span><span>Currency</span><span>Event</span><span>Previous</span><span>Forecast</span><span>Actual</span><span></span>
          </div>
          {loading ? (
            <div className="p-8 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 rounded-md bg-white/[0.04] tj-skeleton" />)}
            </div>
          ) : dayEvents.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--text-muted)]">No events match your filters for this range.</div>
          ) : (
            dayEvents.map((e) => {
              const passed = e.date <= now;
              return (
                <div key={e.id} className={`grid grid-cols-2 sm:grid-cols-[80px_100px_1fr_90px_90px_90px_110px] gap-2 px-3 py-2.5 border-t border-white/5 border-l-2 ${IMPACT_ROW_BORDER[e.impact] || "border-l-transparent"} items-center`}>
                  <span className="text-xs text-[var(--text-secondary)] tj-mono">
                    {selectedRange === "This Week" ? `${fmtDate(e.date)}, ${fmtTime(e.date)}` : fmtTime(e.date)}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">{FLAG[e.country] || "🏳️"} {e.country}</span>
                  <span className="text-sm text-[var(--text-primary)] col-span-2 sm:col-span-1">{e.title}</span>
                  <span className="text-xs text-[var(--text-muted)] tj-mono">{e.previous || "—"}</span>
                  <span className="text-xs text-[var(--text-muted)] tj-mono">{e.forecast || "—"}</span>
                  <span className={`text-xs tj-mono font-semibold ${e.actual ? "text-[var(--text-primary)]" : "text-[var(--text-faint)]"}`}>{e.actual || "—"}</span>
                  <span className="flex justify-start sm:justify-end">
                    {passed ? (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white/[0.06] text-[var(--text-faint)]">Event Passed</span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)]">Upcoming</span>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
