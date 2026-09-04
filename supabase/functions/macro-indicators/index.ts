// Serves three "macro backdrop" series: a synthetic DXY (US Dollar Index),
// the 10-Year Treasury yield, and the VIX.
//
// DXY IS COMPUTED, NOT FETCHED — the real ICE DXY ticker is proprietary
// and not available from any free source. What's computed here is the
// actual published DXY formula (verified against ICE's own FAQ and
// multiple independent sources — not approximated):
//
//   DXY = 50.14348112
//         × EURUSD^(-0.576) × USDJPY^(0.136) × GBPUSD^(-0.119)
//         × USDCAD^(0.091)  × USDSEK^(0.042) × USDCHF^(0.036)
//
// EURUSD/GBPUSD are quoted conventionally (USD per 1 EUR/GBP — dollar is
// the quote currency, hence the negative exponents); USDJPY/USDCAD/
// USDSEK/USDCHF are quoted conventionally the other way (foreign currency
// per 1 USD — dollar is the base currency, hence positive exponents).
// This will not match the exact real-time ICE tick-for-tick (ICE uses
// live interbank mid-prices updated every 15s; this uses ECB reference
// rates published once daily around 16:00 CET), but it is the same
// formula against the same six currencies, so it tracks the real DXY
// closely — unlike showing the Fed's Broad Dollar Index (a different,
// larger currency basket with a different base year) under a "DXY" label,
// which produced a number on a completely different scale (~118 vs ~99)
// and confused users who know what DXY normally looks like.
//
// Exchange rates come from Frankfurter (api.frankfurter.dev), which
// mirrors European Central Bank reference rates — free, no API key,
// no usage cap.
//
// DGS10 (10-Year Treasury yield) and VIXCLS (VIX) are unaffected by any
// of the above — they were already exactly what they claim to be, so
// they're still pulled from FRED as before. A free FRED key is still
// needed for those two: https://fred.stlouisfed.org/docs/api/api_key.html
// then `supabase secrets set FRED_API_KEY=your_key`. DXY works with no
// key at all, and is fetched independently so a missing/bad FRED key
// only affects the other two series, not the dollar index.

const FRED_API_KEY = Deno.env.get("FRED_API_KEY");
const FRANKFURTER_URL = "https://api.frankfurter.dev/v1";
const DXY_CURRENCIES = ["EUR", "JPY", "GBP", "CAD", "SEK", "CHF"];

const FRED_SERIES = [
  { id: "DGS10", label: "10-Year Treasury Yield", unit: "%" },
  { id: "VIXCLS", label: "VIX (Volatility Index)", unit: "index" },
] as const;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — these are daily series; no benefit to polling more often

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

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function computeDxy(rates: Record<string, number>): number | null {
  if (DXY_CURRENCIES.some((c) => !rates[c])) return null; // incomplete day (holiday etc.) — skip rather than compute a wrong value
  const eurusd = 1 / rates.EUR; // USD per 1 EUR (dollar is quote currency)
  const usdjpy = rates.JPY;     // JPY per 1 USD (dollar is base currency)
  const gbpusd = 1 / rates.GBP; // USD per 1 GBP (dollar is quote currency)
  const usdcad = rates.CAD;
  const usdsek = rates.SEK;
  const usdchf = rates.CHF;
  return (
    50.14348112 *
    Math.pow(eurusd, -0.576) *
    Math.pow(usdjpy, 0.136) *
    Math.pow(gbpusd, -0.119) *
    Math.pow(usdcad, 0.091) *
    Math.pow(usdsek, 0.042) *
    Math.pow(usdchf, 0.036)
  );
}

async function fetchDxySeries(days: number) {
  const start = isoDaysAgo(days);
  const params = new URLSearchParams({ base: "USD", symbols: DXY_CURRENCIES.join(",") });
  const res = await fetch(`${FRANKFURTER_URL}/${start}..?${params.toString()}`);
  if (!res.ok) throw new Error(`Frankfurter returned ${res.status}`);
  const body = await res.json();
  const ratesByDate = (body.rates || {}) as Record<string, Record<string, number>>;
  const history = Object.entries(ratesByDate)
    .sort(([a], [b]) => a.localeCompare(b)) // oldest-first
    .map(([date, rates]) => ({ date, value: computeDxy(rates) }))
    .filter((point): point is { date: string; value: number } => point.value !== null);
  if (history.length === 0) throw new Error("Frankfurter returned no usable rate days");
  return { id: "DXY", label: "US Dollar Index (DXY)", unit: "index", history };
}

type FredObservation = { date: string; value: string };

// FRED represents a missing/not-yet-published value as the literal
// string "." — filter those out rather than parsing them as NaN.
async function fetchFredSeries(series: (typeof FRED_SERIES)[number], points: number) {
  if (!FRED_API_KEY) {
    throw new Error("FRED_API_KEY is not configured on this function. Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html and run: supabase secrets set FRED_API_KEY=your_key");
  }
  const params = new URLSearchParams({
    series_id: series.id,
    api_key: FRED_API_KEY,
    file_type: "json",
    sort_order: "desc",
    limit: String(points),
  });
  const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?${params.toString()}`);
  if (!res.ok) throw new Error(`FRED ${series.id} returned ${res.status}`);
  const body = await res.json();
  const observations = (body.observations || []) as FredObservation[];
  const history = observations
    .filter((o) => o.value !== ".")
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .reverse(); // oldest-first, easier for the frontend to plot as a trend
  return { id: series.id, label: series.label, unit: series.unit, history };
}

let cache: { data: unknown[]; fetchedAt: number; failedIds: string[] } | null = null;

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const fresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
    if (!fresh) {
      const ids = ["DXY", ...FRED_SERIES.map((s) => s.id)];
      const settled = await Promise.allSettled([
        fetchDxySeries(90),
        ...FRED_SERIES.map((s) => fetchFredSeries(s, 90)),
      ]);
      const data: unknown[] = [];
      const failedIds: string[] = [];
      settled.forEach((result, i) => {
        if (result.status === "fulfilled") data.push(result.value);
        else failedIds.push(ids[i]);
      });
      if (data.length === 0) throw new Error("All macro indicator requests failed");
      cache = { data, fetchedAt: Date.now(), failedIds };
    }

    return new Response(JSON.stringify({ series: cache!.data, cachedAt: cache!.fetchedAt, failedIds: cache!.failedIds }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (cache) {
      return new Response(JSON.stringify({ series: cache.data, cachedAt: cache.fetchedAt, stale: true, failedIds: cache.failedIds }), {
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
