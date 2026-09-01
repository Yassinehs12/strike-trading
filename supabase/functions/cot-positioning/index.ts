// Proxies the CFTC's public Commitments of Traders (COT) report — Legacy
// "Futures Only" format, which is what most COT tools (and the specific
// "Non-Commercial" categorization Strike Journal's UI mirrors) are built
// on. This is genuinely free, public U.S. government data via CFTC's
// Socrata "SODA" API — no API key or account required.
//
// "Non-Commercial" is the CFTC's own term for large speculators (funds,
// managed money) as opposed to "Commercial" (hedgers) — it's the category
// most retail COT tools lead with, since it's the closest proxy for
// "smart money" positioning. Fields below (noncomm_positions_long_all /
// _short_all) are exact, verified against CFTC's published SODA schema.
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

// Instruments shown in the COT table, and how to find each one in the
// Legacy dataset. market_and_exchange_names is matched with
// `upper(...) like '%...%'` rather than an exact string, since CFTC's
// exact naming/capitalization has changed wording before — a substring
// match is more resilient than hardcoding one exact name.
const INSTRUMENTS = [
  { id: "EUR", label: "EUR", match: "EURO FX" },
  { id: "GBP", label: "GBP", match: "BRITISH POUND" },
  { id: "JPY", label: "JPY", match: "JAPANESE YEN" },
  { id: "CHF", label: "CHF", match: "SWISS FRANC" },
  { id: "CAD", label: "CAD", match: "CANADIAN DOLLAR" },
  { id: "AUD", label: "AUD", match: "AUSTRALIAN DOLLAR" },
  { id: "NZD", label: "NZD", match: "NZ DOLLAR" },
  { id: "GOLD", label: "Gold", match: "GOLD" },
  { id: "SILVER", label: "Silver", match: "SILVER" },
  { id: "NASDAQ", label: "Nasdaq-100", match: "NASDAQ-100" },
  { id: "SP500", label: "S&P 500", match: "S&P 500" },
  { id: "DOW", label: "Dow Jones", match: "DOW JONES" },
  { id: "US10Y", label: "US 10Y Note", match: "10-YEAR U.S. TREASURY NOTES" },
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

// Normalizes one week's raw row plus the prior week's row (for week-over-
// week deltas) into the shape the frontend table renders directly.
function normalizeWeek(row: LegacyRow, prior: LegacyRow | undefined) {
  const longContracts = num(row.noncomm_positions_long_all);
  const shortContracts = num(row.noncomm_positions_short_all);
  const openInterest = num(row.open_interest_all);
  const netPosition = longContracts - shortContracts;
  const totalNonComm = longContracts + shortContracts;

  const priorLong = prior ? num(prior.noncomm_positions_long_all) : null;
  const priorShort = prior ? num(prior.noncomm_positions_short_all) : null;
  const priorOI = prior ? num(prior.open_interest_all) : null;
  const priorNet = prior !== undefined ? (priorLong! - priorShort!) : null;

  return {
    reportDate: row.report_date_as_yyyy_mm_dd,
    longContracts,
    shortContracts,
    longPct: totalNonComm > 0 ? (longContracts / totalNonComm) * 100 : 0,
    shortPct: totalNonComm > 0 ? (shortContracts / totalNonComm) * 100 : 0,
    netPosition,
    openInterest,
    deltaLong: priorLong !== null ? longContracts - priorLong : null,
    deltaShort: priorShort !== null ? shortContracts - priorShort : null,
    deltaOpenInterest: priorOI !== null ? openInterest - priorOI : null,
    // % change in net position vs the prior week, relative to the prior
    // week's absolute net position — this isn't a CFTC-defined field,
    // it's Strike Journal's own "how much did positioning shift" figure.
    netPctChange: priorNet !== null && priorNet !== 0 ? ((netPosition - priorNet) / Math.abs(priorNet)) * 100 : null,
  };
}

// Fetches the last `weeks` reports for one instrument (most recent first).
async function fetchInstrument(inst: (typeof INSTRUMENTS)[number], weeks: number) {
  const params = new URLSearchParams({
    $where: `upper(market_and_exchange_names) like '%${inst.match.toUpperCase()}%'`,
    $order: "report_date_as_yyyy_mm_dd DESC",
    $limit: String(weeks),
  });
  const url = `${LEGACY_URL}?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CFTC ${inst.id} returned ${res.status}`);
  const rows = (await res.json()) as LegacyRow[];
  if (rows.length === 0) throw new Error(`CFTC ${inst.id} returned no rows`);
  return {
    id: inst.id,
    label: inst.label,
    latest: normalizeWeek(rows[0], rows[1]),
    // History (oldest-first) for trend sparklines, mirrors the earlier
    // instrument-detail view.
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
