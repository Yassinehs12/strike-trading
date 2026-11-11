import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { CalendarRange, RefreshCw, AlertTriangle, Info } from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { Card, SectionHeader, Skeleton, EmptyState } from "../components/ui/Primitives";
import { fetchFxSeasonality } from "../db";
import {
  PAIR_GROUPS, PERIODS, MONTH_LABELS, MONTH_NAMES, pairLabel, buildSeasonality, buildHeatmapRows, heatmapScale, formatPct,
} from "../lib/seasonality";

const POS = "#10b981"; // emerald-500, matches the app's positive colour
const NEG = "#f43f5e"; // rose-500, matches the app's negative colour

const fmtYm = (ym) => {
  if (!ym) return "—";
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_LABELS[m - 1]} ${y}`;
};

function heatColor(ret, scale) {
  const a = Math.min(1, Math.abs(ret) / scale) * 0.6 + 0.08;
  return ret > 0 ? `rgba(16,185,129,${a})` : ret < 0 ? `rgba(244,63,94,${a})` : "transparent";
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{d.name}</p>
      <p className="text-[var(--text-tertiary)]">Average: <span className="tj-mono font-semibold" style={{ color: d.avg > 0 ? POS : d.avg < 0 ? NEG : undefined }}>{formatPct(d.avg)}</span></p>
      <p className="text-[var(--text-tertiary)]">Sample: {d.n} months</p>
    </div>
  );
}

function LoadingState({ pair }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-4">
      <span className="sr-only">Loading {pairLabel(pair)} exchange-rate history…</span>
      <Card className="p-5"><Skeleton className="h-4 w-48 mb-4" /><Skeleton className="h-64 w-full" /></Card>
      <Card className="p-5"><Skeleton className="h-4 w-40 mb-4" /><Skeleton className="h-48 w-full" /></Card>
      <Card className="p-5"><Skeleton className="h-4 w-40 mb-4" /><Skeleton className="h-72 w-full" /></Card>
    </div>
  );
}

export const SeasonalityPage = ({ fetchData = fetchFxSeasonality, now = () => new Date() }) => {
  const [pair, setPair] = useState("EURUSD");
  const [period, setPeriod] = useState("10");
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const reqId = useRef(0);

  const load = useCallback((force = false) => {
    const id = ++reqId.current;
    setState({ status: "loading", data: null, error: "" });
    Promise.resolve(fetchData(pair, { force }))
      .then((data) => { if (id === reqId.current) setState({ status: "ready", data, error: "" }); })
      .catch((err) => {
        if (id !== reqId.current) return;
        setState({ status: "error", data: null, error: String(err?.message || err || "Unknown error") });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, fetchData]);

  useEffect(() => { load(false); return () => { reqId.current++; }; }, [load]);

  const result = useMemo(
    () => (state.data ? buildSeasonality(state.data.closes, period, now()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.data, period],
  );
  const heat = useMemo(() => {
    if (!result) return null;
    const entries = result.windowed;
    return { rows: buildHeatmapRows(entries), scale: heatmapScale(entries) };
  }, [result]);

  const label = pairLabel(pair);
  const base = pair.slice(0, 3);
  const quote = pair.slice(3);
  const noData = result && result.completed.length === 0;
  const chartData = result?.stats.map((s) => ({ ...s, value: s.avg }));

  return (
    <div className="p-4 md:p-6 space-y-4 tj-animate-in">
      <Card className="p-4 md:p-5">
        <SectionHeader
          icon={<CalendarRange size={15} />}
          title="Forex Seasonality"
          subtitle="How each currency pair has tended to move in each calendar month, based on completed months of official ECB reference-rate history."
        />
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[11rem]">
            <label htmlFor="seasonality-pair" className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Currency pair</label>
            <select
              id="seasonality-pair" value={pair} onChange={(e) => setPair(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {PAIR_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.pairs.map((p) => <option key={p} value={p}>{pairLabel(p)}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <span id="seasonality-period-label" className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Historical period</span>
            <div role="radiogroup" aria-labelledby="seasonality-period-label" className="flex rounded-lg border border-[var(--border-secondary)] overflow-hidden">
              {PERIODS.map((p) => (
                <button
                  key={p.key} type="button" role="radio" aria-checked={period === p.key} onClick={() => setPeriod(p.key)}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${period === p.key ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
                >{p.label}</button>
              ))}
            </div>
          </div>
          <button
            type="button" onClick={() => load(true)} disabled={state.status === "loading"}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors pb-2.5 disabled:opacity-50"
          >
            <RefreshCw size={12} className={state.status === "loading" ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-4">
          {label} is the price of 1 {base} in {quote}. A positive return means {base} strengthened against {quote} over the month.
        </p>
      </Card>

      {state.status === "loading" && <LoadingState pair={pair} />}

      {state.status === "error" && (
        <div role="alert" className="rounded-xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300 flex flex-wrap items-start gap-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-[12rem]">
            <p className="font-semibold">Couldn't load {label} history.</p>
            <p className="text-xs mt-1 opacity-90 break-words">{state.error}</p>
            <p className="text-xs mt-1 opacity-90">Your other pages are unaffected. Check your connection and try again; if it keeps failing, the data provider may be temporarily unavailable.</p>
          </div>
          <button type="button" onClick={() => load(true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-rose-100">Try again</button>
        </div>
      )}

      {state.status === "ready" && result && (
        <>
          {state.data.stale && (
            <div role="status" className="rounded-xl border border-amber-900 bg-amber-950/30 px-4 py-2.5 text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" /> The data provider couldn't be reached just now, so a previously cached copy is shown.
            </div>
          )}
          {result.insufficientHistory && (
            <div role="status" className="rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-xs text-[var(--text-tertiary)] flex items-center gap-2">
              <Info size={14} className="shrink-0" /> Only {result.coveredMonths} completed months of {label} history are available ({fmtYm(result.firstMonth)} – {fmtYm(result.lastMonth)}), fewer than the {result.period.label} requested. Statistics use everything available.
            </div>
          )}
          {result.missingCount > 0 && (
            <div role="status" className="rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-xs text-[var(--text-tertiary)] flex items-center gap-2">
              <Info size={14} className="shrink-0" /> {result.missingCount} month{result.missingCount > 1 ? "s" : ""} in this period lack the data needed for a return. They are shown as “—” and excluded, never counted as 0%.
            </div>
          )}

          {noData ? (
            <Card><EmptyState icon={CalendarRange} title="Not enough history yet" sub={`There are no completed months of ${label} data to analyze in this period.`} /></Card>
          ) : (
            <>
              <Card className="p-4 md:p-5">
                <SectionHeader
                  title={`${label} — average monthly return`}
                  subtitle={`${result.period.key === "all" ? "All available history" : `Last ${result.period.label}`}: ${fmtYm(result.firstMonth)} – ${fmtYm(result.lastMonth)}, ${result.coveredMonths} completed months.`}
                />
                <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: POS }} /> Positive average</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: NEG }} /> Negative average</span>
                </div>
                <div
                  role="img" className="h-64 md:h-72 w-full"
                  aria-label={`Bar chart of ${label} average monthly returns. ${result.stats.map((s) => `${s.name}: ${s.avg === null ? "no data" : formatPct(s.avg)}`).join("; ")}. The same figures are in the table below.`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border-primary)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--border-secondary)" }} interval={0} />
                      <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={56} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent-soft)" }} />
                      <ReferenceLine y={0} stroke="var(--text-faint)" />
                      <Bar dataKey="value" radius={[3, 3, 3, 3]} isAnimationActive={false}>
                        {chartData.map((d) => <Cell key={d.month} fill={d.avg >= 0 ? POS : NEG} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4 md:p-5">
                <SectionHeader title="Monthly statistics" subtitle="Percentages are shares of valid completed months. Flat = exactly unchanged." />
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[34rem] text-sm">
                    <caption className="sr-only">{label} monthly return statistics by calendar month</caption>
                    <thead>
                      <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border-primary)]">
                        <th scope="col" className="text-left font-semibold py-2 pr-3">Month</th>
                        <th scope="col" className="text-right font-semibold py-2 px-2">Average</th>
                        <th scope="col" className="text-right font-semibold py-2 px-2">Median</th>
                        <th scope="col" className="text-right font-semibold py-2 px-2">% Positive</th>
                        <th scope="col" className="text-right font-semibold py-2 px-2">% Negative</th>
                        <th scope="col" className="text-right font-semibold py-2 px-2">Flat</th>
                        <th scope="col" className="text-right font-semibold py-2 pl-2">Sample</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.stats.map((s) => (
                        <tr key={s.month} className="border-b border-[var(--border-primary)] last:border-0">
                          <th scope="row" className="text-left font-medium text-[var(--text-secondary)] py-2 pr-3">{s.name}</th>
                          <td className="text-right tj-mono py-2 px-2" style={{ color: s.avg > 0 ? POS : s.avg < 0 ? NEG : undefined }}>{formatPct(s.avg)}</td>
                          <td className="text-right tj-mono py-2 px-2" style={{ color: s.median > 0 ? POS : s.median < 0 ? NEG : undefined }}>{formatPct(s.median)}</td>
                          <td className="text-right tj-mono text-[var(--text-secondary)] py-2 px-2">{s.n ? `${s.pctPositive.toFixed(0)}%` : "—"}</td>
                          <td className="text-right tj-mono text-[var(--text-secondary)] py-2 px-2">{s.n ? `${s.pctNegative.toFixed(0)}%` : "—"}</td>
                          <td className="text-right tj-mono text-[var(--text-muted)] py-2 px-2">{s.n ? (s.flat ? `${s.flat} (${s.pctFlat.toFixed(0)}%)` : "0") : "—"}</td>
                          <td className="text-right tj-mono text-[var(--text-secondary)] py-2 pl-2">{s.n}{s.n > 0 && s.n < 5 ? <span title="Very small sample" aria-label="very small sample"> ⚠</span> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-4 md:p-5">
                <SectionHeader title="Year-by-year heatmap" subtitle="Each cell is that calendar month’s return (%). Green = gained, red = fell; deeper colour = larger move." />
                <div className="overflow-x-auto tj-scrollbar -mx-1 px-1">
                  <table className="border-separate text-[11px] min-w-[46rem] w-full table-fixed" style={{ borderSpacing: 2 }}>
                    <colgroup><col style={{ width: "4rem" }} />{MONTH_LABELS.map((m) => <col key={m} />)}</colgroup>
                    <caption className="sr-only">{label} monthly returns, years as rows and months as columns</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="sticky left-0 z-10 bg-[var(--bg-secondary)] text-left text-[var(--text-muted)] font-semibold px-2 py-1">Year</th>
                        {MONTH_LABELS.map((m, i) => <th key={m} scope="col" abbr={MONTH_NAMES[i]} className="text-[var(--text-muted)] font-semibold py-1">{m}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {heat.rows.map((row) => (
                        <tr key={row.year}>
                          <th scope="row" className="sticky left-0 z-10 bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)] font-semibold px-2 py-1 tj-mono">{row.year}</th>
                          {row.cells.map((c, i) => {
                            const name = `${row.year} ${MONTH_NAMES[i]}`;
                            if (!c) return <td key={i} className="rounded bg-[var(--bg-tertiary)]/30" aria-label={`${name}: outside this period`} />;
                            if (c.ret === null) return <td key={i} className="rounded text-center text-[var(--text-faint)] py-1.5 border border-dashed border-[var(--border-secondary)]" aria-label={`${name}: no data`} title="Missing data — not counted as 0%">—</td>;
                            const mtd = c.status === "mtd";
                            const partial = c.status === "partial";
                            const note = mtd ? "Month to date — excluded from averages" : partial ? "Incomplete month — excluded from averages" : null;
                            return (
                              <td
                                key={i} title={note || name}
                                aria-label={`${name}: ${formatPct(c.ret)}${mtd ? " (month to date, excluded from averages)" : partial ? " (incomplete, excluded)" : ""}`}
                                className={`rounded text-center tj-mono py-1.5 text-[var(--text-primary)] ${note ? "border border-dashed border-[var(--text-muted)]" : ""}`}
                                style={{ backgroundColor: heatColor(c.ret, heat.scale) }}
                              >
                                {c.ret > 0 ? "+" : ""}{c.ret.toFixed(2)}
                                {mtd && <span className="block text-[8px] uppercase tracking-wide text-[var(--text-muted)] leading-none mt-0.5">Month to date</span>}
                                {partial && <span className="block text-[8px] uppercase tracking-wide text-[var(--text-muted)] leading-none mt-0.5">Incomplete</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-[var(--text-faint)] mt-3">Dashed cells are not part of the averages: “Month to date” is still in progress; “—” has no usable data.</p>
              </Card>
            </>
          )}

          <Card className="p-4 md:p-5">
            <SectionHeader icon={<Info size={14} />} title="How to read these charts" />
            <ul className="text-xs text-[var(--text-tertiary)] leading-relaxed space-y-1.5 list-disc pl-4">
              <li><strong className="text-[var(--text-secondary)]">Bar chart:</strong> the average return of that calendar month across the selected period. Green bars rose on average, red bars fell.</li>
              <li><strong className="text-[var(--text-secondary)]">Average vs median:</strong> if they differ a lot, a few extreme months are pulling the average. The median is the typical month.</li>
              <li><strong className="text-[var(--text-secondary)]">% Positive / Negative:</strong> how consistent the pattern is. A 1% average from 55% positive months is a weaker signal than the same average from 80%.</li>
              <li><strong className="text-[var(--text-secondary)]">Sample:</strong> the number of years behind each month. Small samples (a ⚠ marks fewer than 5) can easily be noise.</li>
              <li><strong className="text-[var(--text-secondary)]">Heatmap:</strong> every individual month. Look for a colour that keeps repeating down a column, not one bright cell.</li>
              <li><strong className="text-[var(--text-secondary)]">Returns</strong> = last available rate of the month ÷ last available rate of the previous month − 1. Only completed months are used.</li>
            </ul>
            <p className="text-xs text-[var(--text-secondary)] font-semibold mt-3 flex items-start gap-1.5">
              <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-400" />
              Historical seasonality does not guarantee future performance. It is context for your own analysis, not trading advice.
            </p>
          </Card>

          <Card className="p-4 md:p-5">
            <SectionHeader title="Data" noMargin />
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs mt-3">
              <div><dt className="text-[var(--text-muted)]">Provider</dt><dd className="text-[var(--text-secondary)]">
                <a href={state.data.provider?.url || "https://data.ecb.europa.eu/data/datasets/EXR"} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">{state.data.provider?.name || "European Central Bank"}</a> — {state.data.provider?.dataset || "euro foreign exchange reference rates"}
              </dd></div>
              <div><dt className="text-[var(--text-muted)]">Coverage</dt><dd className="text-[var(--text-secondary)]">{state.data.firstObservation} – {state.data.lastObservation} ({state.data.closes.length} months with data{noData ? "" : `; ${result.coveredMonths} used in this view`})</dd></div>
              <div><dt className="text-[var(--text-muted)]">Last updated</dt><dd className="text-[var(--text-secondary)]">{state.data.fetchedAt ? new Date(state.data.fetchedAt).toLocaleString() : "—"} · latest observation {state.data.lastObservation}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Sample sizes</dt><dd className="text-[var(--text-secondary)]">{noData ? "—" : `${result.minSample}–${Math.max(...result.stats.map((s) => s.n))} months per calendar month`}</dd></div>
              {result.mtd && <div><dt className="text-[var(--text-muted)]">Month to date</dt><dd className="text-[var(--text-secondary)]">{fmtYm(result.mtd.ym)}: {formatPct(result.mtd.ret)} so far (excluded from all statistics)</dd></div>}
            </dl>
            <p className="text-[11px] text-[var(--text-faint)] mt-3 leading-relaxed">
              Rates are the ECB’s once-daily euro reference rates (published around 16:00 CET) used as the “close”, so they will differ from broker or exchange closes, and pairs without EUR are derived from two EUR rates. The ECB publishes these for information purposes only. Source: European Central Bank.
            </p>
          </Card>
        </>
      )}
    </div>
  );
};
