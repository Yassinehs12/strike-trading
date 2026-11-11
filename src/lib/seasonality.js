// Monthly seasonality calculations for the Seasonality page.
//
// Input is a list of month-end closes (one per calendar month that has any
// data): [{ ym: "2024-03", date: "2024-03-28", close: 1.0812 }, ...], oldest
// first — exactly what the fx-seasonality edge function returns.
//
// Rules (see the page's "How to read" copy for the user-facing version):
//   • return(m) = (close(m) / close(m-1) − 1) × 100, where m-1 is the
//     IMMEDIATELY preceding calendar month. If that month has no close, the
//     return is `null` (unknown) — never 0, and never a return spanning the gap.
//   • Only completed months feed the statistics. The in-progress month is
//     surfaced as "Month to date" and excluded.
//   • Percent positive / negative / flat are shares of VALID observations.
//   • Period filters (5y/10y/20y) = the most recent 60/120/240 completed
//     calendar months. "All" = everything available.

export const PAIR_GROUPS = [
  {
    label: "Major pairs",
    pairs: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD"],
  },
  {
    label: "Cross pairs",
    pairs: [
      "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURCAD", "EURNZD",
      "GBPJPY", "GBPCHF", "GBPAUD", "GBPCAD", "GBPNZD",
      "AUDJPY", "AUDCAD", "AUDCHF", "AUDNZD",
      "CADJPY", "CADCHF", "CHFJPY",
      "NZDJPY", "NZDCAD", "NZDCHF",
    ],
  },
];

export const PERIODS = [
  { key: "5", label: "5 years", months: 60 },
  { key: "10", label: "10 years", months: 120 },
  { key: "20", label: "20 years", months: 240 },
  { key: "all", label: "All history", months: Infinity },
];

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const pairLabel = (pair) => `${pair.slice(0, 3)}/${pair.slice(3)}`;

// "2024-03" -> absolute month index (monotonic, gap-free across years).
export const ymIndex = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};
const indexToYm = (idx) => `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;

const DAY_MS = 86400000;
// A closed month whose latest observation is older than this many days
// before month end is treated as incomplete *if it is the newest month in
// the dataset* (i.e. stale data), because we can't tell it is really closed.
// Normal month-end gaps (weekend + holidays) are at most ~5 days.
export const MAX_MONTH_END_GAP_DAYS = 7;

function monthEndDate(ym) {
  const [y, m] = ym.split("-").map(Number);
  return Date.UTC(y, m, 0); // day 0 of next month = last day of this month
}

const todayYm = (now) =>
  `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

/**
 * Month-by-month returns for every calendar month from the month after the
 * first close up to the last month present in the data.
 *
 * status:
 *   "valid"   completed month with a computable return
 *   "mtd"     the current, still-open calendar month (has a return so far)
 *   "partial" past month but data ends well before month end (stale feed)
 *   "missing" no close for this month or for the previous month -> unknown
 */
export function buildMonthlyReturns(closes, now = new Date()) {
  if (!Array.isArray(closes) || closes.length === 0) return [];
  const byIdx = new Map();
  for (const c of closes) {
    if (c && typeof c.close === "number" && Number.isFinite(c.close) && c.close > 0 && /^\d{4}-\d{2}$/.test(c.ym)) {
      byIdx.set(ymIndex(c.ym), c);
    }
  }
  if (byIdx.size === 0) return [];
  const idxs = [...byIdx.keys()].sort((a, b) => a - b);
  const first = idxs[0];
  const last = idxs[idxs.length - 1];
  const nowYm = todayYm(now);
  const nowIdx = ymIndex(nowYm);

  const out = [];
  for (let idx = first + 1; idx <= last; idx++) {
    if (idx > nowIdx) break; // future-dated data should never happen; ignore it
    const ym = indexToYm(idx);
    const cur = byIdx.get(idx);
    const prev = byIdx.get(idx - 1);
    const [year, month] = ym.split("-").map(Number);
    const base = { ym, year, month, ret: null, close: cur?.close ?? null, prevClose: prev?.close ?? null, closeDate: cur?.date ?? null };
    if (!cur || !prev) {
      out.push({ ...base, status: idx === nowIdx ? "mtd" : "missing" });
      continue;
    }
    const ret = (cur.close / prev.close - 1) * 100;
    if (idx === nowIdx) {
      out.push({ ...base, ret, status: "mtd" });
    } else if (idx === last && monthEndDate(ym) - Date.parse(cur.date) > MAX_MONTH_END_GAP_DAYS * DAY_MS) {
      out.push({ ...base, ret, status: "partial" });
    } else {
      out.push({ ...base, ret, status: "valid" });
    }
  }
  return out;
}

export function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

/**
 * Per-calendar-month statistics over a set of valid returns.
 * `returns` = entries from buildMonthlyReturns already restricted to the
 * window; only status "valid" entries are used.
 */
export function monthlyStats(returns) {
  const buckets = Array.from({ length: 12 }, () => []);
  for (const r of returns) {
    if (r.status === "valid" && Number.isFinite(r.ret)) buckets[r.month - 1].push(r.ret);
  }
  return buckets.map((vals, i) => {
    const n = vals.length;
    const positive = vals.filter((v) => v > 0).length;
    const negative = vals.filter((v) => v < 0).length;
    const flat = n - positive - negative;
    return {
      month: i + 1,
      label: MONTH_LABELS[i],
      name: MONTH_NAMES[i],
      n,
      avg: mean(vals),
      median: median(vals),
      pctPositive: n ? (positive / n) * 100 : null,
      pctNegative: n ? (negative / n) * 100 : null,
      pctFlat: n ? (flat / n) * 100 : null,
      positive,
      negative,
      flat,
    };
  });
}

/**
 * Applies a period filter and produces everything the page renders.
 * `periodKey`: "5" | "10" | "20" | "all".
 */
export function buildSeasonality(closes, periodKey = "10", now = new Date()) {
  const period = PERIODS.find((p) => p.key === periodKey) || PERIODS[1];
  const all = buildMonthlyReturns(closes, now);
  const validAll = all.filter((r) => r.status === "valid");
  const anchor = validAll.length ? ymIndex(validAll[validAll.length - 1].ym) : null;

  // Window = the most recent N calendar-month slots ending at the latest
  // completed month (gaps inside the window shrink the sample; they are
  // not filled).
  const inWindow = (r) => (anchor === null || period.months === Infinity ? true : ymIndex(r.ym) > anchor - period.months);
  const windowed = all.filter(inWindow);
  const completed = windowed.filter((r) => r.status === "valid");
  const mtd = all.find((r) => r.status === "mtd" && r.ret !== null) || null;

  const stats = monthlyStats(completed);
  const missingCount = windowed.filter((r) => r.status === "missing" || r.status === "partial").length;

  const requestedMonths = period.months === Infinity ? null : period.months;
  const coveredMonths = completed.length;
  const spanMonths = validAll.length
    ? ymIndex(validAll[validAll.length - 1].ym) - ymIndex(validAll[0].ym) + 1
    : 0;

  return {
    period,
    all,
    windowed,
    completed,
    mtd,
    stats,
    missingCount,
    coveredMonths,
    requestedMonths,
    // true when the user asked for e.g. 20y but fewer completed months exist
    insufficientHistory: requestedMonths !== null && spanMonths < requestedMonths,
    firstMonth: completed[0]?.ym ?? null,
    lastMonth: completed[completed.length - 1]?.ym ?? null,
    minSample: stats.length ? Math.min(...stats.map((s) => s.n)) : 0,
  };
}

/**
 * Rows for the year × month heatmap. Includes the current month (status
 * "mtd") so it can be shown, clearly labelled — but it never enters stats.
 * Newest year first. Each row: { year, cells: Array(12) of entry | null }.
 */
export function buildHeatmapRows(entries) {
  const byYear = new Map();
  for (const e of entries) {
    if (!byYear.has(e.year)) byYear.set(e.year, Array(12).fill(null));
    byYear.get(e.year)[e.month - 1] = e;
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, cells]) => ({ year, cells }));
}

/** Magnitude used to scale heatmap colours: the 95th percentile of |return|,
 *  so a single outlier month doesn't wash out every other cell. */
export function heatmapScale(entries) {
  const abs = entries.filter((e) => e.status === "valid").map((e) => Math.abs(e.ret)).sort((a, b) => a - b);
  if (!abs.length) return 1;
  const p95 = abs[Math.min(abs.length - 1, Math.floor(abs.length * 0.95))];
  return p95 > 0 ? p95 : 1;
}

export const formatPct = (v, digits = 2, signed = true) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : `${signed && v > 0 ? "+" : ""}${v.toFixed(digits)}%`;
