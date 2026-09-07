import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  BookOpen, Search, ChevronLeft, ChevronRight, Filter, ArrowUpRight, ArrowDownRight, Trash2, Eye, Download, Loader2, Upload, FileText, Lock, ArrowLeftRight, CalendarDays, Plus, Wallet, X, SlidersHorizontal, ChevronDown,
} from "lucide-react";
import { AssetOptions, Card, EmptyState, SortHeader, StatusPill, useToast } from "../components/ui/Primitives";
import { clamp, fmtUSD2 } from "../lib/format";
import { AddAccountModal } from "../components/trades/TradeComponents";
import { csvToTrades, downloadBlob, tradesToCSV, tradesToPDF } from "../lib/csv";
import { ASSET_GROUPS, SESSIONS } from "../constants";
import { isProPlan } from "../lib/plan";
import { computeKPIs } from "../lib/tradeCalculations";

// Reverse lookup: "NAS100" -> "Index", "XAUUSD" -> "Metal", etc. Only ever
// consulted for assets that exist in ASSET_GROUPS — anything typed in
// manually (e.g. via CSV import) that isn't in the list simply gets no
// sub-label rather than a guessed/invented one.
const ASSET_TYPE_LABELS = { Forex: "Forex", Metals: "Metal", Energy: "Energy", Indices: "Index", Crypto: "Crypto", Stocks: "Stock" };
const ASSET_TYPE_MAP = Object.entries(ASSET_GROUPS).reduce((map, [group, list]) => {
  list.forEach((a) => { map[a] = ASSET_TYPE_LABELS[group]; });
  return map;
}, {});

// "4HBOS / 1H / 5MIN / 1MIN OB" -> "4HBOS" for a scannable table cell. The
// full string is never discarded — it's still available via the title
// attribute (tooltip) and in the trade detail drawer.
const shortSetup = (setup) => {
  if (!setup) return "—";
  const first = setup.split("/")[0].trim();
  return first.length > 18 ? `${first.slice(0, 17)}…` : first || "—";
};

const fmtDateShort = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
};

const SummaryStat = ({ label, value, tone }) => (
  <div className="flex items-baseline gap-1.5">
    <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
    <span className={`tj-mono text-sm font-bold ${tone || "text-[var(--text-primary)]"}`}>{value}</span>
  </div>
);

export const CalendarCard = ({ trades, onOpenTrade, compact = false, showWeeklySummary = false }) => {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
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
  const monthEntries = Object.entries(byDay).filter(([date]) => new Date(date).getMonth() === month && new Date(date).getFullYear() === year);
  const monthTotal = monthEntries.reduce((s, [, v]) => s + v.pnl, 0);
  const monthDays = monthEntries.length;

  // 7-day (Sun-Sat) week rows spanning the visible grid, including the
  // leading/trailing days that belong to adjacent months — a week can
  // straddle two months, so its date range and totals reflect that.
  const weeks = useMemo(() => {
    if (!showWeeklySummary) return [];
    const gridStart = new Date(year, month, 1 - startOffset);
    const totalWeeks = Math.ceil(cells.length / 7);
    return Array.from({ length: totalWeeks }, (_, w) => {
      const start = new Date(gridStart); start.setDate(gridStart.getDate() + w * 7);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      let pnl = 0, days = 0;
      Object.entries(byDay).forEach(([date, v]) => {
        const d = new Date(date + "T00:00:00");
        if (d >= start && d <= end) { pnl += v.pnl; days += 1; }
      });
      return { start, end, pnl, days };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWeeklySummary, year, month, startOffset, cells.length, byDay]);

  const fmtRange = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"><ChevronLeft size={15} /></button>
            <h3 className="font-bold text-[var(--text-primary)]">{monthLabel}</h3>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"><ChevronRight size={15} /></button>
            {compact && (
              <button onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors">
                <CalendarDays size={13} /> Today
              </button>
            )}
          </div>
          {compact ? (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[var(--text-muted)]">PnL: <span className={`font-semibold tj-mono ${monthTotal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{monthTotal >= 0 ? "+" : ""}{fmtUSD2(monthTotal)}</span></span>
              <span className="text-[var(--text-muted)]">Days: <span className="font-semibold text-[var(--text-primary)]">{monthDays}</span></span>
            </div>
          ) : (
            <p className={`text-xs tj-mono ${monthTotal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{monthTotal >= 0 ? "+" : ""}{fmtUSD2(monthTotal)} net this month</p>
          )}
        </div>

        <div className={showWeeklySummary ? "grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5" : ""}>
          <div>
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
                    className={`relative ${compact ? "aspect-[4/3]" : "aspect-square"} rounded-lg border flex flex-col items-center justify-center transition-transform hover:scale-[1.04] ${info ? "cursor-pointer" : "cursor-default"} ${info ? cellColor(info.pnl) : "bg-[var(--bg-secondary)]/40"} ${isToday ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/60" : "border-white/10"}`}
                    style={info ? { backgroundColor: info.pnl > 0 ? `rgba(16,185,129,${cellOpacity(info.pnl)})` : info.pnl < 0 ? `rgba(244,63,94,${cellOpacity(info.pnl)})` : "#3f3f46" } : {}}>
                    {isToday && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />}
                    <span className={`${compact ? "text-xs" : "text-[11px]"} font-medium ${isToday ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>{d}</span>
                    {info ? (
                      <>
                        <span className={`${compact ? "hidden sm:inline text-[9px]" : "text-[10px]"} tj-mono text-[var(--text-primary)] font-semibold leading-tight flex items-center gap-0.5`}>
                          {compact && <ArrowLeftRight size={8} />}{info.count}{!compact && ` trade${info.count === 1 ? "" : "s"}`}
                        </span>
                        <span className="text-[10px] tj-mono text-[var(--text-primary)]/80 leading-tight">{info.pnl >= 0 ? "+$" : "-$"}{Math.abs(Math.round(info.pnl))}</span>
                      </>
                    ) : (
                      <>
                        <span className={`${compact ? "hidden sm:inline text-[9px]" : "text-[9px]"} tj-mono text-[var(--text-faint)] leading-tight`}>0 Trade</span>
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
          </div>

          {showWeeklySummary && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-faint)] mb-2.5">Weekly Summary</h4>
              <div className="space-y-2">
                {weeks.map((w, i) => (
                  <div key={i} className="bg-[var(--bg-tertiary)]/60 border border-white/10 rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-[var(--text-primary)]">Week {["One", "Two", "Three", "Four", "Five", "Six"][i] || i + 1}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{fmtRange(w.start)} - {fmtRange(w.end)}</span>
                    </div>
                    {w.days === 0 ? (
                      <span className="text-xs text-[var(--text-muted)]">No trades</span>
                    ) : (
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-[var(--text-muted)]">PnL: <span className={`font-semibold tj-mono ${w.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{w.pnl >= 0 ? "+" : ""}{fmtUSD2(w.pnl)}</span></span>
                        <span className="text-[var(--text-muted)]">Days: <span className="font-semibold text-[var(--text-primary)]">{w.days}</span></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
  );
};

/* ============================================================
   TRADE JOURNAL PAGE
   ============================================================ */


const DEFAULT_FILTERS = { asset: "All", setup: "All", outcome: "All", session: "All", search: "" };
const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

export const JournalPage = ({ trades, onDelete, onOpenTrade, onImportTrades, profile, accounts = [], onAddAccount, onEditAccount, onRemoveAccount, accountLimit = 3, onLogTrade }) => {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortConfig, setSortConfig] = useState({ key: "date", dir: "desc" });
  const [importing, setImporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const importInputRef = useRef(null);
  const toast = useToast();

  const accountFilteredTrades = useMemo(
    () => (selectedAccountId ? trades.filter((t) => t.accountId === selectedAccountId) : trades),
    [trades, selectedAccountId]
  );

  const setupOptions = useMemo(
    () => Array.from(new Set(accountFilteredTrades.map((t) => t.setup).filter(Boolean))).sort(),
    [accountFilteredTrades]
  );

  const filtered = useMemo(() => {
    let list = accountFilteredTrades.filter((t) => {
      if (filters.asset !== "All" && t.asset !== filters.asset) return false;
      if (filters.setup !== "All" && t.setup !== filters.setup) return false;
      if (filters.outcome !== "All" && t.status !== filters.outcome) return false;
      if (filters.session !== "All" && t.session !== filters.session) return false;
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
  }, [accountFilteredTrades, filters, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);
  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const clearFilters = () => { setFilters(DEFAULT_FILTERS); setPage(1); };
  const onSort = (key) => setSortConfig((sc) => ({ key, dir: sc.key === key && sc.dir === "desc" ? "asc" : "desc" }));
  const activeFilterCount = Object.keys(DEFAULT_FILTERS).filter((k) => filters[k] !== DEFAULT_FILTERS[k]).length;

  // KPIs for the currently selected account/filter scope — reuses the same
  // computeKPIs the Analytics page relies on, so these numbers always agree.
  const kpis = useMemo(() => computeKPIs(accountFilteredTrades), [accountFilteredTrades]);
  const accountStatsMap = useMemo(() => {
    const map = {};
    accounts.forEach((a) => { map[a.id] = computeKPIs(trades.filter((t) => t.accountId === a.id)); });
    return map;
  }, [trades, accounts]);
  const allAccountsStats = useMemo(() => computeKPIs(trades), [trades]);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || null;

  const exportCSV = () => {
    if (!isProPlan(profile)) { toast("CSV export is a Pro feature.", "error"); return; }
    downloadBlob(tradesToCSV(filtered), "trade_journal_export.csv"); toast(`Exported ${filtered.length} trades to CSV`, "info");
  };

  const exportPDF = async () => {
    if (!isProPlan(profile)) { toast("PDF export is a Pro feature.", "error"); return; }
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

  const confirmDelete = (id) => {
    if (window.confirm("Delete this trade? This can't be undone.")) onDelete(id);
  };

  const openAddAccount = () => {
    if (accounts.length >= accountLimit) {
      toast(`You've reached the ${accountLimit}-account limit on your current plan.`, "error");
      return;
    }
    setAccountModalOpen(true);
  };

  const trueEmpty = trades.length === 0;
  const noResults = !trueEmpty && filtered.length === 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] tracking-tight">Trade Journal</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Every trade, documented, searchable, and built for review.</p>
      </div>

      {/* ACCOUNT SWITCHER */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)]/50 border border-white/10 overflow-x-auto tj-scrollbar max-w-full">
          <button
            onClick={() => { setSelectedAccountId(null); setPage(1); }}
            className={`flex flex-col items-start px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
              selectedAccountId === null ? "bg-[var(--bg-secondary)] shadow-sm" : "hover:bg-white/5"
            }`}
          >
            <span className={`text-xs font-semibold ${selectedAccountId === null ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>All Accounts</span>
            <span className="text-[10px] tj-mono text-[var(--text-faint)]">
              {allAccountsStats.total} trades · <span className={allAccountsStats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>{allAccountsStats.netProfit >= 0 ? "+" : ""}{fmtUSD2(allAccountsStats.netProfit)}</span>
            </span>
          </button>
          {accounts.map((a) => {
            const stats = accountStatsMap[a.id];
            const active = selectedAccountId === a.id;
            return (
              <div key={a.id} className="relative group shrink-0">
                <button
                  onClick={() => { setSelectedAccountId(a.id); setPage(1); }}
                  className={`flex flex-col items-start pl-3 pr-6 py-1.5 rounded-lg transition-colors ${active ? "bg-[var(--bg-secondary)] shadow-sm" : "hover:bg-white/5"}`}
                >
                  <span className={`text-xs font-semibold flex items-center gap-1 ${active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                    <Wallet size={10} /> {a.name}
                  </span>
                  <span className="text-[10px] tj-mono text-[var(--text-faint)]">
                    {stats?.total ?? 0} trades · <span className={(stats?.netProfit ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>{(stats?.netProfit ?? 0) >= 0 ? "+" : ""}{fmtUSD2(stats?.netProfit ?? 0)}</span>
                  </span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveAccount(a.id); if (selectedAccountId === a.id) setSelectedAccountId(null); }}
                  className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 text-[var(--text-faint)] hover:text-rose-400 transition-opacity"
                  aria-label={`Remove ${a.name}`}
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
        <button
          onClick={openAddAccount}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-white/15 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/50 transition-colors shrink-0"
        >
          <Plus size={11} /> Add Account <span className="text-[var(--text-faint)]">({accounts.length}/{accountLimit === Infinity ? "∞" : accountLimit})</span>
        </button>
      </div>
      <AddAccountModal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} onSave={onAddAccount} editing={null} />

      {/* JOURNAL SUMMARY */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">{selectedAccount ? selectedAccount.name : "All Accounts"}</span>
        <SummaryStat label="Trades" value={kpis.total} />
        <SummaryStat label="Net P&L" value={`${kpis.netProfit >= 0 ? "+" : ""}${fmtUSD2(kpis.netProfit)}`} tone={kpis.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} />
        <SummaryStat label="Win Rate" value={`${kpis.winRate.toFixed(2)}%`} />
        <SummaryStat label="Profit Factor" value={Number.isFinite(kpis.profitFactor) ? kpis.profitFactor.toFixed(2) : "∞"} />
        <SummaryStat label="Expectancy" value={`${kpis.expectancy >= 0 ? "+" : ""}${fmtUSD2(kpis.expectancy)}`} tone={kpis.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"} />
      </div>

      {/* FILTER BAR */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-1.5 flex-1 min-w-[160px]">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input placeholder="Search trades..." className="bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder-zinc-600 w-full" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} />
          </div>
          <select className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)]" value={filters.asset} onChange={(e) => setFilter("asset", e.target.value)}><option>All</option><AssetOptions /></select>
          <select className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)]" value={filters.outcome} onChange={(e) => setFilter("outcome", e.target.value)}><option>All</option><option>Win</option><option>Loss</option><option>BE</option></select>
          <button
            onClick={() => setMoreFiltersOpen((v) => !v)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${moreFiltersOpen ? "border-[var(--accent)]/50 text-[var(--accent)] bg-[var(--accent)]/10" : "border-white/10 text-[var(--text-secondary)] hover:border-white/20"}`}
          >
            <SlidersHorizontal size={13} /> Filters <ChevronDown size={12} className={`transition-transform ${moreFiltersOpen ? "rotate-180" : ""}`} />
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-rose-400 transition-colors">
              <X size={12} /> Clear filters
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto pl-2 border-l border-white/10">
            <button onClick={exportCSV} className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-secondary)] text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors">{!isProPlan(profile) ? <Lock size={12} /> : <Download size={12} />} CSV</button>
            <button onClick={exportPDF} disabled={exportingPdf} className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] disabled:opacity-40 text-[var(--text-secondary)] text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors">
              {exportingPdf ? <Loader2 size={12} className="animate-spin" /> : !isProPlan(profile) ? <Lock size={12} /> : <FileText size={12} />} PDF
            </button>
            <input ref={importInputRef} type="file" accept=".csv" onChange={handleImportFile} className="hidden" />
            <button onClick={() => importInputRef.current?.click()} disabled={importing}
              title="Import trades from a CSV file (e.g. exported from MT4/MT5 or a prop firm)"
              className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] disabled:opacity-40 text-[var(--text-secondary)] text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors">
              {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Import
            </button>
          </div>
        </div>

        {moreFiltersOpen && (
          <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2.5 border-t border-white/10">
            <select className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)]" value={filters.setup} onChange={(e) => setFilter("setup", e.target.value)}><option value="All">All setups</option>{setupOptions.map((s) => <option key={s}>{s}</option>)}</select>
            <select className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)]" value={filters.session} onChange={(e) => setFilter("session", e.target.value)}><option value="All">All sessions</option>{SESSIONS.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-2.5">
          <Filter size={11} /> {filtered.length} trade{filtered.length === 1 ? "" : "s"}
        </div>
      </Card>

      {/* TRADE TABLE */}
      <Card className="overflow-hidden">
        {trueEmpty ? (
          <EmptyState
            icon={BookOpen}
            title="No trades yet"
            sub="Your trading history will appear here once you log your first trade."
            action={
              <div className="flex items-center gap-2 mt-4">
                {onLogTrade && (
                  <button onClick={onLogTrade} className="flex items-center gap-1.5 tj-gradient-bg hover:opacity-90 text-[var(--text-inverse)] font-semibold text-sm px-4 py-2 rounded-lg transition-all">
                    <Plus size={14} /> Log Trade
                  </button>
                )}
                <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-1.5 border border-white/10 hover:border-white/20 text-[var(--text-secondary)] font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                  <Upload size={14} /> Import CSV
                </button>
                <input ref={importInputRef} type="file" accept=".csv" onChange={handleImportFile} className="hidden" />
              </div>
            }
          />
        ) : noResults ? (
          <EmptyState
            icon={Search}
            title="No trades match your filters."
            sub="Try adjusting your search or filters."
            action={
              <button onClick={clearFilters} className="mt-4 flex items-center gap-1.5 border border-white/10 hover:border-white/20 text-[var(--text-secondary)] font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                <X size={14} /> Clear Filters
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto tj-scrollbar">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]/60 border-b border-white/10">
                    <SortHeader label="Date" sortKey="date" sortConfig={sortConfig} onSort={onSort} />
                    <SortHeader label="Asset" sortKey="asset" sortConfig={sortConfig} onSort={onSort} />
                    <th className="px-4 py-2.5 font-medium">Direction</th>
                    <th className="px-4 py-2.5 font-medium text-right">Entry</th>
                    <th className="px-4 py-2.5 font-medium text-right">Exit</th>
                    <th className="px-4 py-2.5 font-medium">Setup</th>
                    <th className="px-4 py-2.5 font-medium">Session</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <SortHeader label="P&L" sortKey="pnl" sortConfig={sortConfig} onSort={onSort} />
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((t) => {
                    const isLong = t.direction === "Long";
                    const assetType = ASSET_TYPE_MAP[t.asset];
                    return (
                      <tr key={t.id} onClick={() => onOpenTrade(t)} className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-secondary)]/40 transition-colors group cursor-pointer">
                        <td className="px-4 py-2.5 tj-mono text-xs text-[var(--text-tertiary)] whitespace-nowrap">{fmtDateShort(t.date)}</td>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-[var(--text-primary)] leading-tight">{t.asset}</div>
                          {assetType && <div className="text-[10px] text-[var(--text-faint)] leading-tight">{assetType}</div>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold tracking-wide px-1.5 py-0.5 rounded ${isLong ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                            {isLong ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />} {isLong ? "LONG" : "SHORT"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 tj-mono text-xs text-[var(--text-tertiary)] text-right">{t.entry}</td>
                        <td className="px-4 py-2.5 tj-mono text-xs text-[var(--text-tertiary)] text-right">{t.exit}</td>
                        <td className="px-4 py-2.5 text-[var(--text-tertiary)] text-xs" title={t.setup || undefined}>{shortSetup(t.setup)}</td>
                        <td className="px-4 py-2.5">
                          {t.session ? <span className="text-[11px] text-[var(--text-tertiary)] bg-white/5 border border-white/10 rounded px-1.5 py-0.5">{t.session}</span> : <span className="text-[var(--text-faint)] text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5"><StatusPill status={t.status} /></td>
                        <td className={`px-4 py-2.5 text-right tj-mono font-bold ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{t.pnl >= 0 ? "+" : ""}{fmtUSD2(t.pnl)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); onOpenTrade(t); }} aria-label="View trade" className="text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors"><Eye size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); confirmDelete(t.id); }} aria-label="Delete trade" className="text-[var(--text-faint)] hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="bg-[var(--bg-primary)] border border-white/10 rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)]"
                >
                  {ROWS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-white/10 disabled:opacity-30 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"><ChevronLeft size={15} /></button>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-white/10 disabled:opacity-30 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"><ChevronRight size={15} /></button>
                </div>
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
