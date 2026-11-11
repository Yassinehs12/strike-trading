// Pure helpers for the fx-seasonality edge function. Deliberately free of any
// Deno / network APIs so they can be unit-tested with Vitest
// (src/lib/fxServer.test.js).
//
// Source data: ECB euro foreign exchange reference rates (dataset EXR,
// frequency D, series type SP00). Every rate is "units of <currency> per
// 1 EUR". Any pair is derived from two EUR-based rates:
//
//   BASE/QUOTE (price of 1 BASE in QUOTE) = (QUOTE per EUR) / (BASE per EUR)
//
// with EUR itself being exactly 1. A date with no rate for either leg is
// simply absent from that pair's series — it is never filled or zeroed.

export const ECB_CURRENCIES = ["USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD"] as const;
export const SUPPORTED_CODES: string[] = ["EUR", ...ECB_CURRENCIES];

// code -> (ISO date -> units of code per 1 EUR)
export type DailyRates = Record<string, Record<string, number>>;
export type SeriesPoint = { date: string; rate: number };
export type MonthEndClose = { ym: string; date: string; close: number };

// Minimal RFC-4180-style line splitter (handles quoted fields with commas).
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// Parses the ECB Data Portal `format=csvdata` response. Columns are located by
// header name (not position) so extra/reordered attribute columns don't matter.
// Rows with a blank, non-numeric or non-positive OBS_VALUE are dropped —
// they are missing observations, not zeros.
export function parseEcbCsv(csv: string): DailyRates {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new Error("ECB response contained no data rows");
  const header = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^﻿/, ""));
  const iCur = header.indexOf("CURRENCY");
  const iTime = header.indexOf("TIME_PERIOD");
  const iVal = header.indexOf("OBS_VALUE");
  if (iCur < 0 || iTime < 0 || iVal < 0) {
    throw new Error("ECB response is missing expected columns (CURRENCY, TIME_PERIOD, OBS_VALUE)");
  }
  const out: DailyRates = {};
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const code = (cells[iCur] || "").trim();
    const date = (cells[iTime] || "").trim();
    const raw = (cells[iVal] || "").trim();
    if (!code || !/^\d{4}-\d{2}-\d{2}$/.test(date) || raw === "") continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) continue;
    (out[code] ||= {})[date] = value;
  }
  return out;
}

// Daily series for BASE/QUOTE, oldest first. Only dates where both legs have
// a published rate are included.
export function crossSeries(daily: DailyRates, base: string, quote: string): SeriesPoint[] {
  if (base === quote) throw new Error("Base and quote currencies must differ");
  const legs = (code: string): Record<string, number> | null =>
    code === "EUR" ? null : daily[code] || {};
  const baseLeg = legs(base);
  const quoteLeg = legs(quote);
  if ((base !== "EUR" && !Object.keys(baseLeg!).length) || (quote !== "EUR" && !Object.keys(quoteLeg!).length)) {
    return [];
  }
  // Drive from the non-EUR leg's dates (EUR has a rate on every date).
  const dates = Object.keys(baseLeg || quoteLeg!).sort();
  const series: SeriesPoint[] = [];
  for (const date of dates) {
    const b = baseLeg ? baseLeg[date] : 1;
    const q = quoteLeg ? quoteLeg[date] : 1;
    if (!(b > 0) || !(q > 0)) continue; // missing leg on this date -> skip the date
    series.push({ date, rate: q / b });
  }
  return series;
}

// Last available observation in each calendar month (series must be sorted
// ascending by date). Months with no observations at all are simply absent.
export function monthEndCloses(series: SeriesPoint[]): MonthEndClose[] {
  const byMonth = new Map<string, MonthEndClose>();
  for (const p of series) {
    byMonth.set(p.date.slice(0, 7), { ym: p.date.slice(0, 7), date: p.date, close: p.rate });
  }
  return [...byMonth.values()].sort((a, b) => a.ym.localeCompare(b.ym));
}
