// Proxies the CFTC's public Commitments of Traders (COT) data for the
// instruments Strike Journal cares about: Gold (COMEX) and Nasdaq-100 /
// S&P 500 e-mini futures. This is genuinely free, public U.S. government
// data via CFTC's Socrata "SODA" API — no API key or account required.
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
// Two different CFTC datasets are needed because gold and equity index
// futures are classified differently:
//   - Gold is a commodity  -> "Disaggregated Futures Only" report, which
//     breaks positions into Producer/Merchant, Swap Dealers, Managed
//     Money, and Other Reportables. Managed Money is the closest thing to
//     "smart money" positioning for a commodity.
//   - Nasdaq-100 / S&P 500 e-minis are financial futures -> "Traders in
//     Financial Futures" (TFF) report, which breaks positions into
//     Dealers, Asset Managers, Leveraged Money, and Other Reportables.
//     Leveraged Money (hedge funds/CTAs) is the closest "smart money"
//     analog here.
// Field names below are exact — verified against CFTC's published SODA
// schema, not guessed. Note "swap__positions_short_all" has a genuine
// double underscore in the real dataset; that's not a typo introduced here.
//
// Docs: https://publicreporting.cftc.gov/  (Socrata SODA API, no key needed
// for this volume of traffic; an optional free app token can be added
// later via the CFTC_APP_TOKEN secret + X-App-Token header if CFTC ever
// rate-limits the anonymous tier).

const DISAGGREGATED_URL = "https://publicreporting.cftc.gov/resource/72hh-3qpy.json";
const TFF_URL = "https://publicreporting.cftc.gov/resource/gpe5-46if.json";

// Instruments shown on the Macro & Sentiment page, and how to find each
// one in its respective CFTC dataset. market_and_exchange_names is
// matched with `upper(...) like '%...%'` rather than an exact string,
// since CFTC's exact naming/capitalization has changed wording before —
// a substring match is more resilient than hardcoding one exact name.
const INSTRUMENTS = [
  { id: "GOLD", label: "Gold (COMEX)", dataset: "disaggregated" as const, match: "GOLD" },
  { id: "NASDAQ100", label: "Nasdaq-100 E-mini", dataset: "tff" as const, match: "NASDAQ-100" },
  { id: "SP500", label: "S&P 500 E-mini", dataset: "tff" as const, match: "S&P 500" },
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

type CotRow = Record<string, string>;

// Normalizes a raw CFTC row (disaggregated or TFF — different column
// names) into one common shape the frontend can render either way.
function normalizeRow(row: CotRow, dataset: "disaggregated" | "tff") {
  const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const openInterest = num(row.open_interest_all);

  if (dataset === "disaggregated") {
    const smartLong = num(row.m_money_positions_long_all);
    const smartShort = num(row.m_money_positions_short_all);
    const commercialLong = num(row.prod_merc_positions_long_all);
    const commercialShort = num(row.prod_merc_positions_short_all);
    return {
      reportDate: row.report_date_as_yyyy_mm_dd,
      openInterest,
      smartMoneyLabel: "Managed Money",
      smartMoneyLong: smartLong,
      smartMoneyShort: smartShort,
      smartMoneyNet: smartLong - smartShort,
      commercialLabel: "Producer/Merchant",
      commercialLong,
      commercialShort,
      commercialNet: commercialLong - commercialShort,
    };
  }
  const smartLong = num(row.lev_money_positions_long);
  const smartShort = num(row.lev_money_positions_short);
  const commercialLong = num(row.dealer_positions_long_all);
  const commercialShort = num(row.dealer_positions_short_all);
  return {
    reportDate: row.report_date_as_yyyy_mm_dd,
    openInterest,
    smartMoneyLabel: "Leveraged Money",
    smartMoneyLong: smartLong,
    smartMoneyShort: smartShort,
    smartMoneyNet: smartLong - smartShort,
    commercialLabel: "Dealers",
    commercialLong,
    commercialShort,
    commercialNet: commercialLong - commercialShort,
  };
}

// Fetches the last `weeks` reports for one instrument (most recent first),
// so the frontend can show a short net-positioning trend, not just the
// latest snapshot.
async function fetchInstrument(inst: (typeof INSTRUMENTS)[number], weeks: number) {
  const baseUrl = inst.dataset === "disaggregated" ? DISAGGREGATED_URL : TFF_URL;
  // Built with URLSearchParams (not manual string interpolation) so the
  // SoQL `%` wildcards, spaces, and the literal "&" in "S&P 500" all get
  // percent-encoded correctly for the query string.
  const params = new URLSearchParams({
    $where: `upper(market_and_exchange_names) like '%${inst.match.toUpperCase()}%'`,
    $order: "report_date_as_yyyy_mm_dd DESC",
    $limit: String(weeks),
  });
  const url = `${baseUrl}?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CFTC ${inst.id} returned ${res.status}`);
  const rows = (await res.json()) as CotRow[];
  return {
    id: inst.id,
    label: inst.label,
    history: rows.map((r) => normalizeRow(r, inst.dataset)),
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
