// Proxies the CFTC's public Commitments of Traders (COT) report — Legacy
// "Futures Only" format, which has both the "Non-Commercial" (large
// speculators) and "Commercial" (hedgers) categorizations Strike
// Journal's UI toggles between. This is genuinely free, public U.S.
// government data via CFTC's Socrata "SODA" API — no API key or account
// required.
//
// CRITICAL: instruments are matched by EXACT `cftc_contract_market_code`,
// never by a fuzzy name match. An earlier version of this file matched on
// `market_and_exchange_names LIKE '%...%'`, which silently mixed multiple
// unrelated contracts into one instrument whenever their names shared a
// substring — e.g. "DOW JONES" matched both the actual Dow futures
// (124603) AND the completely unrelated "Dow Jones U.S. Real Estate
// Index" (124606); "GOLD" matched both COMEX Gold (088691) and Micro Gold
// (088695); "EURO FX" matched multiple related FX cross-rate contracts.
// The result was corrupted data — multiple different markets' numbers
// interleaved under one label, sometimes even resolving to a contract
// that stopped being actively reported years ago. Every code below was
// verified against CFTC's own published contract lists (not guessed):
// https://www.cftc.gov/MarketReports/CommitmentsofTraders/AbouttheCOTReports/cot_about
//   EUR    099741  Euro FX (CME)
//   GBP    096742  British Pound Sterling (CME)
//   JPY    097741  Japanese Yen (CME)
//   CHF    092741  Swiss Franc (CME)
//   CAD    090741  Canadian Dollar (CME)
//   AUD    232741  Australian Dollar (CME)
//   NZD    112741  NZ Dollar (CME)
//   GOLD   088691  Gold (COMEX) — NOT 088695 (Micro Gold)
//   SILVER 084691  Silver (COMEX)
//   NASDAQ 209742  Nasdaq-100 Stock Index Mini (CME) — the liquid, actively
//                  traded one; 209741 (full-size) is largely inactive
//   SP500  13874A  E-mini S&P 500 (CME) — the liquid one; 138741
//                  (full-size) is largely inactive
//   DOW    124603  Dow Jones Industrial Avg x $5 (CBOT) — NOT 124606
//                  (Dow Jones U.S. Real Estate Index)
//   US10Y  043602  10-Year U.S. Treasury Notes (CBOT)
//
// Why a proxy instead of calling it from the browser: (1) not CORS-enabled
// for arbitrary origins, and (2) so every visitor shares one cached fetch
// instead of hammering CFTC's endpoint on every page load.
//
// CFTC publishes a NEW report only once a week (Fridays ~3:30pm ET, for
// the prior Tuesday's positions) — so this is cached far longer than the
// econ-calendar function. There's no point re-fetching more than a few
// times a day.
//
// Docs: https://publicreporting.cftc.gov/  (Socrata SODA API, no key needed
// for this volume of traffic; an optional free app token can be added
// later via a CFTC_APP_TOKEN secret + X-App-Token header if CFTC ever
// rate-limits the anonymous tier).

const LEGACY_URL = "https://publicreporting.cftc.gov/resource/6dca-aqww.json";

const INSTRUMENTS = [
  { id: "EUR", label: "EUR", code: "099741" },
  { id: "GBP", label: "GBP", code: "096742" },
  { id: "JPY", label: "JPY", code: "097741" },
  { id: "CHF", label: "CHF", code: "092741" },
  { id: "CAD", label: "CAD", code: "090741" },
  { id: "AUD", label: "AUD", code: "232741" },
  { id: "NZD", label: "NZD", code: "112741" },
  { id: "GOLD", label: "Gold", code: "088691" },
  { id: "SILVER", label: "Silver", code: "084691" },
  { id: "NASDAQ", label: "Nasdaq-100", code: "209742" },
  { id: "SP500", label: "S&P 500", code: "13874A" },
  { id: "DOW", label: "Dow Jones", code: "124603" },
  { id: "US10Y", label: "US 10Y Note", code: "043602" },
];

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — CFTC only republishes weekly; this just controls how quickly a fresh weekly release propagates

const ALLOWED_ORIGINS = new Set([
  "https://strikejournal.com",
  "https://www.strikejournal.com",
  "http://localhost:5173",
]);

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://www.strikejournal.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

type LegacyRow = Record<string, string>;

function num(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// CFTC Legacy report has two trader categories per week, sharing the same
// field-naming pattern (`{prefix}_positions_{long|short}_all`):
//   - "noncomm" -> Non-Commercial (large speculators / funds) — the
//     category most retail COT tools lead with.
//   - "comm"    -> Commercial (hedgers/producers) — the classic "smart
//     money hedging" counterpart, and typically the mirror image of
//     Non-Commercial since one side's long is roughly the other's short.
const CATEGORY_FIELD_PREFIX = { nonCommercial: "noncomm", commercial: "comm" } as const;

// Builds one category's (long/short/net/pct/deltas) block for a given week.
function normalizeCategory(prefix: string, row: LegacyRow, prior: LegacyRow | undefined) {
  const longContracts = num(row[`${prefix}_positions_long_all`]);
  const shortContracts = num(row[`${prefix}_positions_short_all`]);
  const netPosition = longContracts - shortContracts;
  const total = longContracts + shortContracts;

  const priorLong = prior ? num(prior[`${prefix}_positions_long_all`]) : null;
  const priorShort = prior ? num(prior[`${prefix}_positions_short_all`]) : null;
  const priorNet = priorLong !== null ? priorLong - priorShort! : null;

  return {
    longContracts,
    shortContracts,
    longPct: total > 0 ? (longContracts / total) * 100 : 0,
    shortPct: total > 0 ? (shortContracts / total) * 100 : 0,
    netPosition,
    deltaLong: priorLong !== null ? longContracts - priorLong : null,
    deltaShort: priorShort !== null ? shortContracts - priorShort : null,
    // % change in net position vs the prior week, relative to the prior
    // week's absolute net position — this isn't a CFTC-defined field,
    // it's Strike Journal's own "how much did positioning shift" figure.
    netPctChange: priorNet !== null && priorNet !== 0 ? ((netPosition - priorNet) / Math.abs(priorNet)) * 100 : null,
  };
}

// Normalizes one week's raw row plus the prior week's row into both
// category blocks, plus the fields shared across categories (report date,
// open interest).
function normalizeWeek(row: LegacyRow, prior: LegacyRow | undefined) {
  const openInterest = num(row.open_interest_all);
  const priorOI = prior ? num(prior.open_interest_all) : null;
  return {
    reportDate: row.report_date_as_yyyy_mm_dd,
    openInterest,
    deltaOpenInterest: priorOI !== null ? openInterest - priorOI : null,
    nonCommercial: normalizeCategory(CATEGORY_FIELD_PREFIX.nonCommercial, row, prior),
    commercial: normalizeCategory(CATEGORY_FIELD_PREFIX.commercial, row, prior),
  };
}

// Fetches the last `weeks` reports for one instrument (most recent first).
// Matched by EXACT cftc_contract_market_code — see the file header for why
// this must never go back to a fuzzy name match.
async function fetchInstrument(inst: (typeof INSTRUMENTS)[number], weeks: number) {
  const params = new URLSearchParams({
    $where: `cftc_contract_market_code = '${inst.code}'`,
    $order: "report_date_as_yyyy_mm_dd DESC",
    $limit: String(weeks),
  });
  const url = `${LEGACY_URL}?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CFTC ${inst.id} (code ${inst.code}) returned ${res.status}`);
  const rows = (await res.json()) as LegacyRow[];
  if (rows.length === 0) throw new Error(`CFTC ${inst.id} (code ${inst.code}) returned no rows`);
  return {
    id: inst.id,
    label: inst.label,
    latest: normalizeWeek(rows[0], rows[1]),
    // History (oldest-first) for trend sparklines.
    history: [...rows].reverse().map((r, i, arr) => normalizeWeek(r, i > 0 ? arr[i - 1] : undefined)),
  };
}

let cache: { data: unknown[]; fetchedAt: number; failedIds: string[] } | null = null;

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const fresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
    if (!fresh) {
      const settled = await Promise.allSettled(INSTRUMENTS.map((inst) => fetchInstrument(inst, 12)));
      const data: unknown[] = [];
      const failedIds: string[] = [];
      settled.forEach((result, i) => {
        if (result.status === "fulfilled") data.push(result.value);
        else failedIds.push(INSTRUMENTS[i].id);
      });
      if (data.length === 0) throw new Error("All CFTC COT requests failed");
      cache = { data, fetchedAt: Date.now(), failedIds };
    }

    return new Response(JSON.stringify({ instruments: cache!.data, cachedAt: cache!.fetchedAt, failedIds: cache!.failedIds }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (cache) {
      return new Response(JSON.stringify({ instruments: cache.data, cachedAt: cache.fetchedAt, stale: true, failedIds: cache.failedIds }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
