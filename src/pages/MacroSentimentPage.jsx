import React, { useState, useEffect, useMemo } from "react";
import { Compass, TrendingUp, TrendingDown, Users, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, EmptyState } from "../components/ui/Primitives";
import { fetchCotPositioning, fetchMacroIndicators, fetchRetailSentiment } from "../db";
import { ASSET_GROUPS } from "../constants";

// Friendlier display names for tickers that aren't a plain currency pair.
// Anything not listed here falls back to inserting a "/" for 6-letter
// pair-style tickers (EURUSD -> EUR/USD), or the raw ticker otherwise.
const LABEL_OVERRIDES = {
  US30: "Dow Jones 30", NAS100: "Nasdaq 100", SP500: "S&P 500",
  GER40: "DAX 40", UK100: "FTSE 100", JPN225: "Nikkei 225", FRA40: "CAC 40",
  USOIL: "WTI Crude Oil", UKOIL: "Brent Crude Oil", NATGAS: "Natural Gas",
  XAUUSD: "Gold (XAU/USD)", XAGUSD: "Silver (XAG/USD)",
  BTCUSD: "Bitcoin", ETHUSD: "Ethereum", SOLUSD: "Solana", XRPUSD: "XRP",
};

// Broker/feed naming varies (XAUUSD vs GOLD, NAS100 vs USTEC vs US100), so
// each ticker is matched against a few plausible aliases rather than one
// exact string. Anything not listed here is matched against itself only.
const MATCH_OVERRIDES = {
  XAUUSD: ["XAUUSD", "GOLD"], XAGUSD: ["XAGUSD", "SILVER"],
  USOIL: ["USOIL", "WTI", "USOUSD", "CRUDE"], UKOIL: ["UKOIL", "BRENT", "UKOUSD"],
  NATGAS: ["NATGAS", "NGAS"],
  US30: ["US30", "DJ30", "DJI30"], NAS100: ["NAS100", "USTEC", "US100"],
  SP500: ["SP500", "SPX500", "US500"], GER40: ["GER40", "DAX40", "DE40", "GER30"],
  UK100: ["UK100", "FTSE100"], JPN225: ["JPN225", "JP225", "NIKKEI225"], FRA40: ["FRA40", "CAC40"],
  BTCUSD: ["BTCUSD", "BITCOIN"], ETHUSD: ["ETHUSD", "ETHEREUM"], XRPUSD: ["XRPUSD", "RIPPLE"],
};

function labelFor(ticker) {
  if (LABEL_OVERRIDES[ticker]) return LABEL_OVERRIDES[ticker];
  if (/^[A-Z]{6}$/.test(ticker)) return `${ticker.slice(0, 3)}/${ticker.slice(3)}`;
  return ticker;
}

// Built from the same ASSET_GROUPS used to populate the asset picker in
// the Trade Journal, so every pair a trade can be logged against also
// shows up here — instead of a hand-picked shortlist. Individual stocks
// (Stocks group) are excluded: MyFxBook's retail outlook is FX/metals/
// energy/indices/crypto only, so single-equity sentiment is never
// available and would just render nothing.
function buildSentimentWatchlist() {
  const tickers = Object.entries(ASSET_GROUPS)
    .filter(([group]) => group !== "Stocks")
    .flatMap(([, list]) => list);
  return tickers.map((ticker) => ({ match: MATCH_OVERRIDES[ticker] || [ticker], label: labelFor(ticker) }));
}

function findSentimentSymbol(symbols, matchList) {
  return symbols.find((s) => matchList.some((m) => (s.name || "").toUpperCase().includes(m)));
}

function TrendSparkline({ history, positive }) {
  if (!history || history.length < 2) return null;
  const values = history.map((h) => h.value ?? h.smartMoneyNet ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / range) * 30}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-8">
      <polyline points={points} fill="none" strokeWidth="2" className={positive ? "stroke-emerald-400" : "stroke-rose-400"} />
    </svg>
  );
}

function MacroCard({ series }) {
  if (!series?.history?.length) return null;
  const history = series.history;
  const latest = history[history.length - 1];
  const prior = history.length > 1 ? history[history.length - 2] : null;
  const change = prior ? latest.value - prior.value : 0;
  const positive = change >= 0;
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wide mb-1">{series.label}</p>
      <div className="flex items-end justify-between gap-2 mb-2">
        <span className="text-2xl font-bold text-[var(--text-primary)] tj-mono">{latest.value.toFixed(2)}</span>
        {prior && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change).toFixed(2)}
          </span>
        )}
      </div>
      <TrendSparkline history={history} positive={positive} />
      <p className="text-[10px] text-[var(--text-faint)] mt-1">{latest.date}</p>
    </Card>
  );
}

function CotBarChart({ instrument, category }) {
  if (!instrument) return null;
  const { longPct, shortPct } = instrument.latest[category];
  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-xs font-semibold">
        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Long</span>
        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400" /> Short</span>
      </div>
      <div className="flex h-40 w-full rounded-lg overflow-hidden border border-[var(--border-primary)]">
        <div className="flex flex-col justify-end w-full">
          <div className="bg-rose-400/90 flex items-start justify-center pt-1" style={{ height: `${shortPct}%` }}>
            {shortPct >= 12 && <span className="text-[10px] font-bold text-white">{shortPct.toFixed(0)}%</span>}
          </div>
          <div className="bg-indigo-500 flex items-end justify-center pb-1" style={{ height: `${longPct}%` }}>
            {longPct >= 12 && <span className="text-[10px] font-bold text-white">{longPct.toFixed(0)}%</span>}
          </div>
        </div>
      </div>
      <p className="text-center text-xs font-semibold text-[var(--text-primary)] mt-2">{instrument.label}</p>
    </div>
  );
}

const COT_COLUMNS = [
  { key: "label", label: "Symbol", align: "left" },
  { key: "longContracts", label: "Long Contracts" },
  { key: "shortContracts", label: "Short Contracts" },
  { key: "deltaLong", label: "Δ Long" },
  { key: "deltaShort", label: "Δ Short" },
  { key: "longPct", label: "Long %" },
  { key: "shortPct", label: "Short %" },
  { key: "netPosition", label: "Net Position" },
  { key: "openInterest", label: "Open Interest" },
  { key: "deltaOpenInterest", label: "Δ Open Interest" },
];

const COT_CATEGORIES = [
  { key: "nonCommercial", label: "Non-Commercial" },
  { key: "commercial", label: "Commercial" },
];

function fmtCotValue(key, value) {
  if (value === null || value === undefined) return "—";
  if (key === "longPct" || key === "shortPct") return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

function CotReportPanel({ instruments }) {
  const [selectedId, setSelectedId] = useState(null);
  const [category, setCategory] = useState("nonCommercial");
  const [sortKey, setSortKey] = useState("label");
  const [sortDir, setSortDir] = useState("asc");

  // openInterest / deltaOpenInterest are shared across categories; the
  // rest come from whichever category (Non-Commercial / Commercial) is
  // currently selected.
  const rows = useMemo(
    () => instruments.map((inst) => ({
      id: inst.id, label: inst.label,
      openInterest: inst.latest.openInterest, deltaOpenInterest: inst.latest.deltaOpenInterest,
      ...inst.latest[category],
    })),
    [instruments, category]
  );
  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") return av.localeCompare(bv) * dir;
      return ((av ?? 0) - (bv ?? 0)) * dir;
    });
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "label" ? "asc" : "desc"); }
  };

  const selected = instruments.find((i) => i.id === selectedId) || instruments[0];

  if (instruments.length === 0) return null;

  return (
    <Card className="p-4 md:p-5">
      <div className="flex justify-end mb-3">
        <div className="flex rounded-lg border border-[var(--border-primary)] overflow-hidden">
          {COT_CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${category === c.key ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <CotBarChart instrument={selected} category={category} />
        <div className="overflow-x-auto tj-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                {COT_COLUMNS.map((col) => (
                  <th key={col.key} onClick={() => toggleSort(col.key)}
                    className={`px-2 py-2 font-semibold text-[10px] uppercase tracking-wide text-[var(--text-faint)] cursor-pointer select-none hover:text-[var(--text-secondary)] whitespace-nowrap ${col.align === "left" ? "text-left" : "text-right"}`}>
                    {col.label}{sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id} onClick={() => setSelectedId(row.id)}
                  className={`border-b border-[var(--border-primary)]/40 cursor-pointer transition-colors hover:bg-[var(--bg-tertiary)]/60 ${selected?.id === row.id ? "bg-[var(--accent)]/10" : ""}`}>
                  <td className="px-2 py-2 font-semibold text-[var(--text-primary)] whitespace-nowrap">{row.label}</td>
                  <td className="px-2 py-2 text-right tj-mono text-[var(--text-secondary)]">{fmtCotValue("longContracts", row.longContracts)}</td>
                  <td className="px-2 py-2 text-right tj-mono text-[var(--text-secondary)]">{fmtCotValue("shortContracts", row.shortContracts)}</td>
                  <td className={`px-2 py-2 text-right tj-mono ${row.deltaLong >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtCotValue("deltaLong", row.deltaLong)}</td>
                  <td className={`px-2 py-2 text-right tj-mono ${row.deltaShort >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtCotValue("deltaShort", row.deltaShort)}</td>
                  <td className="px-2 py-2 text-right tj-mono text-indigo-400">{fmtCotValue("longPct", row.longPct)}</td>
                  <td className="px-2 py-2 text-right tj-mono text-rose-400">{fmtCotValue("shortPct", row.shortPct)}</td>
                  <td className={`px-2 py-2 text-right tj-mono font-semibold ${row.netPosition >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtCotValue("netPosition", row.netPosition)}</td>
                  <td className="px-2 py-2 text-right tj-mono text-[var(--text-secondary)]">{fmtCotValue("openInterest", row.openInterest)}</td>
                  <td className={`px-2 py-2 text-right tj-mono ${row.deltaOpenInterest >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtCotValue("deltaOpenInterest", row.deltaOpenInterest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-faint)] mt-3">
        Week of {selected?.latest?.reportDate} · CFTC Commitments of Traders, {COT_CATEGORIES.find((c) => c.key === category)?.label} category · click a row to change the chart
      </p>
    </Card>
  );
}

function SentimentBar({ label, symbol }) {
  if (!symbol) return null;
  const long = symbol.longPercentage ?? 0;
  const short = symbol.shortPercentage ?? 0;
  // Classic contrarian read: heavy retail crowding on one side is treated
  // as a lean toward the other side, not a recommendation — just a
  // framing note shown alongside the raw numbers.
  const crowded = Math.max(long, short) >= 65;
  return (
    <div className="py-3 border-b border-[var(--border-primary)]/60 last:border-b-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
        {crowded && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Crowded</span>}
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-[var(--bg-tertiary)] mb-1.5">
        <div className="bg-emerald-500" style={{ width: `${long}%` }} />
        <div className="bg-rose-500" style={{ width: `${short}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-emerald-400 font-semibold">{long}% long</span>
        <span className="text-rose-400 font-semibold">{short}% short</span>
      </div>
    </div>
  );
}

export const MacroSentimentPage = () => {
  const [cot, setCot] = useState(null);
  const [macro, setMacro] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const loadAll = () => {
    setLoading(true);
    Promise.allSettled([fetchCotPositioning(), fetchMacroIndicators(), fetchRetailSentiment()]).then(([c, m, s]) => {
      if (c.status === "fulfilled") setCot(c.value); else setErrors((e) => ({ ...e, cot: c.reason?.message || "Failed to load COT positioning." }));
      if (m.status === "fulfilled") setMacro(m.value); else setErrors((e) => ({ ...e, macro: m.reason?.message || "Failed to load macro indicators." }));
      if (s.status === "fulfilled") setSentiment(s.value); else setErrors((e) => ({ ...e, sentiment: s.reason?.message || "Failed to load retail sentiment." }));
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); }, []);

  const sentimentWatchlist = useMemo(() => buildSentimentWatchlist(), []);
  const matchedSentiment = useMemo(() => {
    if (!sentiment?.symbols?.length) return [];
    return sentimentWatchlist
      .map((w) => ({ label: w.label, sym: findSentimentSymbol(sentiment.symbols, w.match) }))
      .filter((row) => row.sym);
  }, [sentiment, sentimentWatchlist]);

  const hasAnyData = cot?.instruments?.length || macro?.series?.length || sentiment?.symbols?.length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-[var(--accent)]" />
            <h3 className="font-bold text-[var(--text-primary)] text-sm">Macro & Sentiment</h3>
          </div>
          <button onClick={loadAll} disabled={loading} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Institutional positioning (CFTC), the macro backdrop (US Dollar Index, 10-Year yield, VIX), and retail crowd positioning — sourced weekly/daily from public data, not advice.
        </p>
      </Card>

      {!loading && !hasAnyData && (
        <Card className="p-4">
          <EmptyState icon={AlertTriangle} title="No data available yet"
            sub="This usually means the required API keys haven't been configured on the backend yet — see the setup notes in each edge function." />
        </Card>
      )}

      {/* Macro backdrop */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-2">Macro Backdrop</h4>
        {errors.macro && <div className="mb-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">{errors.macro}</div>}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-[var(--bg-tertiary)] tj-skeleton" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(macro?.series || []).map((s) => <MacroCard key={s.id} series={s} />)}
          </div>
        )}
      </div>

      {/* COT positioning */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-2">Latest COT Report (Non-Commercial)</h4>
        {errors.cot && <div className="mb-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">{errors.cot}</div>}
        {loading ? (
          <div className="h-64 rounded-xl bg-[var(--bg-tertiary)] tj-skeleton" />
        ) : (
          <CotReportPanel instruments={cot?.instruments || []} />
        )}
      </div>

      {/* Retail sentiment */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-2 flex items-center gap-1.5"><Users size={12} /> Retail Positioning (contrarian read)</h4>
        {errors.sentiment && <div className="mb-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">{errors.sentiment}</div>}
        <Card className="p-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-md bg-[var(--bg-tertiary)] tj-skeleton" />)}</div>
          ) : matchedSentiment.length ? (
            matchedSentiment.map((row) => <SentimentBar key={row.label} label={row.label} symbol={row.sym} />)
          ) : (
            <p className="text-xs text-[var(--text-muted)] text-center py-6">
              {sentiment?.symbols?.length
                ? "None of your tradable pairs are covered by the retail sentiment feed right now."
                : "Retail sentiment data isn't available right now."}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};
