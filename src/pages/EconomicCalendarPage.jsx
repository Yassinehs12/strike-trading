import React, { useState, useEffect, useMemo } from "react";
import { Filter, CalendarClock, RefreshCw, X, Radio, ChevronRight } from "lucide-react";
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
const IMPACT_DOT = { High: "bg-rose-500", Medium: "bg-amber-400", Low: "bg-emerald-500", Holiday: "bg-white/30" };
const IMPACT_BADGE = {
  High: "bg-rose-500/10 text-rose-400",
  Medium: "bg-amber-400/10 text-amber-400",
  Low: "bg-emerald-500/10 text-emerald-400",
  Holiday: "bg-white/5 text-[var(--text-faint)]",
};
const IMPACT_LABEL = { High: "High Impact", Medium: "Medium Impact", Low: "Low Impact", Holiday: "No Impact" };

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

function fmtCountdown(ms) {
  if (ms <= 0) return "now";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

function dateGroupLabel(d, now) {
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return `Today · ${d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}`;
  if (sameDay(d, tomorrow)) return `Tomorrow · ${d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}`;
  if (sameDay(d, yesterday)) return `Yesterday · ${d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}`;
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }).toUpperCase();
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
  const [detailEvent, setDetailEvent] = useState(null);

  useEffect(() => { try { localStorage.setItem("econCalendar.impacts", JSON.stringify(impacts)); } catch {} }, [impacts]);
  useEffect(() => { try { localStorage.setItem("econCalendar.currencies", JSON.stringify(currencies)); } catch {} }, [currencies]);
  useEffect(() => { try { localStorage.setItem("econCalendar.showPassed", String(showPassed)); } catch {} }, [showPassed]);

  const toggleImpact = (v) => setImpacts((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleCurrency = (c) => setCurrencies((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const allCurrenciesSelected = currencies.length === CURRENCIES.length;
  const toggleAllCurrencies = () => setCurrencies(allCurrenciesSelected ? [] : [...CURRENCIES]);
  const allImpactsSelected = impacts.length === 4;

  const [rawEvents, setRawEvents] = useState([]);
  const [failedUrls, setFailedUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const loadEvents = () => {
    setError("");
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

  const retry = () => { setLoading(true); loadEvents(); };

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

  // The next major event ignores the active filters/range entirely — it's
  // a standing "what's coming up" signal, ranked High > Medium > Low, not
  // whatever the person currently happens to be looking at.
  const nextMajorEvent = useMemo(() => {
    const upcoming = events.filter((e) => e.date > now).sort((a, b) => a.date - b.date);
    if (upcoming.length === 0) return null;
    const rank = { High: 0, Medium: 1, Low: 2, Holiday: 3 };
    const soonWindow = upcoming.filter((e) => e.date - upcoming[0].date < 1000 * 60 * 60 * 6); // within 6h of the very next release
    return [...soonWindow].sort((a, b) => rank[a.impact] - rank[b.impact] || a.date - b.date)[0];
  }, [events, now]);

  const fmtDate = (d) => d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const fmtFullDate = (d) => d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const highImpactCount = dayEvents.filter((e) => e.impact === "High").length;

  const resetFilters = () => {
    setImpacts(["High", "Medium", "Low", "Holiday"]);
    setCurrencies([...CURRENCIES]);
    setShowPassed(true);
  };
  const isFiltered = !allImpactsSelected || !allCurrenciesSelected || !showPassed;

  // Grouped rows: only "This Week" spans multiple calendar days, so that's
  // the only view where date separators add anything.
  const groups = useMemo(() => {
    if (selectedRange !== "This Week") return [{ label: null, items: dayEvents }];
    const map = new Map();
    for (const e of dayEvents) {
      const key = toISODate(e.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ label: dateGroupLabel(items[0].date, now), items }));
  }, [dayEvents, selectedRange, now]);

  return (
    <div className="p-4 md:p-6">
      <Card className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-[var(--accent)]" />
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-sm leading-tight">Economic Calendar</h3>
              <p className="text-[11px] text-[var(--text-faint)] leading-tight">Live market-moving events</p>
            </div>
            {!loading && !error && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-1">
                <Radio size={9} className="animate-pulse" /> LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-xs text-[var(--text-faint)]">
                {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
                {highImpactCount > 0 && <span className="text-rose-400 font-medium"> · {highImpactCount} high impact</span>}
              </span>
            )}
            <button onClick={retry} title="Refresh" className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">Sourced from Forex Factory's public calendar feed — rate decisions, CPI, NFP, and more that can move the markets you trade.</p>

        {/* Error state (distinct from empty state) */}
        {error && (
          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-3.5 py-3">
            <div>
              <p className="font-semibold">Unable to load economic events</p>
              <p className="text-rose-400/80 mt-0.5">We couldn't retrieve the latest calendar data.</p>
            </div>
            <button onClick={retry} className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/40 hover:bg-rose-500/20 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* Next major event */}
        {!loading && !error && (
          nextMajorEvent ? (
            <button onClick={() => setDetailEvent(nextMajorEvent)}
              className="w-full text-left mb-4 rounded-lg border border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent)]/10 via-[var(--accent)]/5 to-transparent px-4 py-3 flex items-center justify-between gap-3 flex-wrap hover:border-[var(--accent)]/50 transition-colors group">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-bold tracking-wide text-[var(--accent)] uppercase shrink-0 [writing-mode:vertical-lr] sm:[writing-mode:horizontal-tb]">Next</span>
                <span className="text-lg leading-none shrink-0">{FLAG[nextMajorEvent.country] || "🏳️"}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{nextMajorEvent.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${IMPACT_BADGE[nextMajorEvent.impact]}`}>{IMPACT_LABEL[nextMajorEvent.impact]}</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-faint)]">{nextMajorEvent.country} · {dateGroupLabel(nextMajorEvent.date, now).replace(/·.*/, "").trim() || fmtDate(nextMajorEvent.date)} · {fmtTime(nextMajorEvent.date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-auto">
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-wide text-[var(--text-faint)]">Previous</div>
                  <div className="text-xs tj-mono text-[var(--text-secondary)]">{nextMajorEvent.previous || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-wide text-[var(--text-faint)]">Forecast</div>
                  <div className="text-xs tj-mono text-[var(--text-secondary)]">{nextMajorEvent.forecast || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-wide text-[var(--text-faint)]">Countdown</div>
                  <div className="text-xs font-bold tj-mono text-[var(--accent)]">{fmtCountdown(nextMajorEvent.date - now)}</div>
                </div>
                <ChevronRight size={14} className="text-[var(--text-faint)] group-hover:text-[var(--accent)] transition-colors" />
              </div>
            </button>
          ) : null
        )}

        {loading && (
          <div className="mb-4 h-14 rounded-lg bg-[var(--bg-tertiary)] tj-skeleton" />
        )}

        {/* Range chips */}
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto tj-scrollbar pb-1">
          {RANGES.map((r) => {
            const isSelected = r === selectedRange;
            return (
              <button key={r} onClick={() => setSelectedRange(r)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 ${
                  isSelected ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]" : "bg-[var(--bg-tertiary)] border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/70"
                }`}>
                {r}
              </button>
            );
          })}
          <span className="text-[11px] text-[var(--text-faint)] ml-1 hidden sm:inline">
            {selectedRange === "This Week"
              ? `${fmtDate(rangeBounds("This Week", today)[0])} – ${fmtDate(rangeBounds("This Week", today)[1])}`
              : fmtFullDate(rangeBounds(selectedRange, today)[0])}
          </span>
        </div>

        {/* Filters */}
        <div className="mb-4 pb-4 border-b border-[var(--border-primary)] space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] mr-0.5 hidden sm:inline">Impact</span>
            {IMPACT_LEVELS.map((lvl) => {
              const on = impacts.includes(lvl.value);
              return (
                <button key={lvl.value} onClick={() => toggleImpact(lvl.value)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 ${on ? lvl.active : "bg-transparent border-[var(--border-primary)] text-[var(--text-faint)] hover:border-[var(--border-secondary)] hover:text-[var(--text-muted)]"}`}>
                  {lvl.label}
                </button>
              );
            })}
            <button onClick={() => toggleImpact("Holiday")}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 ${impacts.includes("Holiday") ? "bg-[var(--text-primary)]/10 border-[var(--text-primary)]/40 text-[var(--text-primary)]" : "bg-transparent border-[var(--border-primary)] text-[var(--text-faint)] hover:border-[var(--border-secondary)] hover:text-[var(--text-muted)]"}`}>
              No Impact
            </button>

            <div className="w-px h-6 bg-[var(--border-primary)] mx-1 hidden sm:block" />

            <div className="relative">
              <button onClick={() => setCurrencyMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border-primary)] bg-transparent text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60">
                <Filter size={12} /> Currencies {allCurrenciesSelected ? "(All)" : `(${currencies.length})`}
              </button>
              {currencyMenuOpen && (
                <div className="absolute z-30 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl p-2 tj-animate-in">
                  <button onClick={toggleAllCurrencies} className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-colors mb-1">
                    {allCurrenciesSelected ? "Clear all" : "Select all"}
                  </button>
                  <div className="max-h-56 overflow-y-auto tj-scrollbar space-y-0.5">
                    {CURRENCIES.map((c) => (
                      <label key={c} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors">
                        <input type="checkbox" checked={currencies.includes(c)} onChange={() => toggleCurrency(c)} className="accent-[var(--accent)]" />
                        {FLAG[c]} {c}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { key: "High", label: "Major potential volatility" },
                { key: "Medium", label: "Moderate potential volatility" },
                { key: "Low", label: "Limited expected impact" },
              ].map((l) => (
                <span key={l.key} className="flex items-center gap-1.5 text-[10px] text-[var(--text-faint)]" title={l.label}>
                  <span className={`w-1.5 h-1.5 rounded-full ${IMPACT_DOT[l.key]}`} /> {l.key.toUpperCase()}
                </span>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Show Passed Events</span>
              <button type="button" role="switch" aria-checked={showPassed} onClick={() => setShowPassed((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 ${showPassed ? "bg-[var(--accent)]" : "bg-[var(--border-secondary)]"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showPassed ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </label>
          </div>
        </div>

        {/* Table (desktop) / cards (mobile) */}
        <div className="rounded-lg overflow-hidden border border-[var(--border-primary)]">
          <div className="hidden sm:grid grid-cols-[80px_100px_1fr_90px_90px_90px_110px] gap-2 px-3 py-2.5 bg-[var(--bg-tertiary)] text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)] sticky top-0 z-10">
            <span>{selectedRange === "This Week" ? "Time" : "Time"}</span><span>Currency</span><span>Event</span><span className="text-right">Previous</span><span className="text-right">Forecast</span><span className="text-right">Actual</span><span></span>
          </div>

          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-md bg-[var(--bg-tertiary)] tj-skeleton" style={{ animationDelay: `${i * 60}ms` }} />)}
            </div>
          ) : error ? null : dayEvents.length === 0 ? (
            <div className="p-10 text-center">
              <CalendarClock size={22} className="text-[var(--text-faint)] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">No economic events found</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">There are no events matching your current filters.</p>
              {isFiltered && (
                <>
                  <ul className="text-xs text-[var(--text-faint)] mt-3 space-y-0.5">
                    {!allImpactsSelected && <li>• Try viewing all impact levels</li>}
                    {!allCurrenciesSelected && <li>• Try changing the currency filter</li>}
                    {selectedRange !== "This Week" && <li>• Try selecting another date range</li>}
                  </ul>
                  <button onClick={resetFilters} className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-md bg-[var(--accent)]/10 border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors">
                    Reset Filters
                  </button>
                </>
              )}
            </div>
          ) : (
            groups.map((g, gi) => (
              <div key={gi}>
                {g.label && (
                  <div className="px-3 py-1.5 bg-[var(--bg-tertiary)]/60 text-[10px] font-bold uppercase tracking-wide text-[var(--text-faint)] border-t border-[var(--border-primary)]/60">
                    {g.label}
                  </div>
                )}
                {g.items.map((e, i) => {
                  const passed = e.date <= now;
                  return (
                    <button key={e.id} onClick={() => setDetailEvent(e)}
                      className={`w-full text-left grid grid-cols-2 sm:grid-cols-[80px_100px_1fr_90px_90px_90px_110px] gap-2 px-3 py-2.5 border-t border-[var(--border-primary)]/60 border-l-2 ${IMPACT_ROW_BORDER[e.impact] || "border-l-transparent"} items-center transition-colors hover:bg-[var(--bg-tertiary)]/50 ${i % 2 === 1 ? "bg-[var(--bg-primary)]/40" : ""} ${passed ? "opacity-60 hover:opacity-100" : ""}`}>
                      <span className="text-xs text-[var(--text-secondary)] tj-mono">{fmtTime(e.date)}</span>
                      <span className="text-xs text-[var(--text-secondary)] font-semibold flex items-center gap-1.5">
                        <span className="text-sm leading-none">{FLAG[e.country] || "🏳️"}</span> {e.country}
                      </span>
                      <span className="col-span-2 sm:col-span-1 min-w-0">
                        <span className="text-sm text-[var(--text-primary)] font-medium block truncate">{e.title}</span>
                        <span className="sm:hidden flex items-center gap-1 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${IMPACT_DOT[e.impact]}`} /> <span className="text-[10px] text-[var(--text-faint)]">{IMPACT_LABEL[e.impact]}</span>
                        </span>
                      </span>
                      <span className="text-xs text-[var(--text-muted)] tj-mono text-right">{e.previous || "—"}</span>
                      <span className="text-xs text-[var(--text-muted)] tj-mono text-right">{e.forecast || "—"}</span>
                      <span className={`text-xs tj-mono font-semibold text-right ${e.actual ? "text-[var(--text-primary)]" : "text-[var(--text-faint)]"}`}>{e.actual || "—"}</span>
                      <span className="hidden sm:flex justify-end">
                        {passed ? (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-faint)]">Passed</span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)]">Upcoming</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Detail panel */}
      {detailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 tj-animate-in" onClick={() => setDetailEvent(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{FLAG[detailEvent.country] || "🏳️"}</span>
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{detailEvent.title}</div>
                  <div className="text-[11px] text-[var(--text-faint)]">{detailEvent.country} · {fmtFullDate(detailEvent.date)} · {fmtTime(detailEvent.date)}</div>
                </div>
              </div>
              <button onClick={() => setDetailEvent(null)} className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                <X size={14} />
              </button>
            </div>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mb-4 ${IMPACT_BADGE[detailEvent.impact]}`}>{IMPACT_LABEL[detailEvent.impact]}</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Previous", value: detailEvent.previous },
                { label: "Forecast", value: detailEvent.forecast },
                { label: "Actual", value: detailEvent.actual },
              ].map((f) => (
                <div key={f.label} className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/40 px-2.5 py-2 text-center">
                  <div className="text-[9px] uppercase tracking-wide text-[var(--text-faint)]">{f.label}</div>
                  <div className={`text-sm font-semibold tj-mono mt-0.5 ${f.value ? "text-[var(--text-primary)]" : "text-[var(--text-faint)]"}`}>{f.value || "—"}</div>
                </div>
              ))}
            </div>
            {detailEvent.date > now && (
              <div className="mt-3 text-center text-xs text-[var(--text-faint)]">
                Releases in <span className="font-semibold text-[var(--accent)] tj-mono">{fmtCountdown(detailEvent.date - now)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
