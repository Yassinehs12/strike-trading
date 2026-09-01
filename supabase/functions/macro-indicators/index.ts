// Proxies three FRED (Federal Reserve Economic Data) series that make up
// the macro backdrop for the instruments Strike Journal's traders watch:
//   - DTWEXBGS  Nominal Broad U.S. Dollar Index — the closest free,
//     official equivalent to the (proprietary) ICE DXY. Gold trades
//     inversely to dollar strength.
//   - DGS10     10-Year Treasury Constant Maturity Rate — real yields are
//     Gold's tightest macro correlation.
//   - VIXCLS    CBOE Volatility Index (VIX) — the standard risk-on/
//     risk-off gauge, most relevant to Nasdaq.
// All three are free, but FRED requires a (free, instant, no-cost) API
// key: register at https://fred.stlouisfed.org/docs/api/api_key.html,
// then `supabase secrets set FRED_API_KEY=your_key_here`.
//
// Why a proxy instead of calling FRED from the browser: the key would be
// exposed client-side, and FRED's docs ask that keys not be shared/
// embedded in public client code.
//
// FRED updates most of these once a day (some, like VIX, only after the
// U.S. market close) — no need to poll more than a few times a day.

const FRED_API_KEY = Deno.env.get("FRED_API_KEY");

const SERIES = [
  { id: "DTWEXBGS", label: "US Dollar Index (Broad)", unit: "index" },
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

type FredObservation = { date: string; value: string };

// FRED represents a missing/not-yet-published value as the literal
// string "." — filter those out rather than parsing them as NaN.
async function fetchSeries(seriesId: string, points: number) {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: FRED_API_KEY || "",
    file_type: "json",
    sort_order: "desc",
    limit: String(points),
  });
  const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?${params.toString()}`);
  if (!res.ok) throw new Error(`FRED ${seriesId} returned ${res.status}`);
  const body = await res.json();
  const observations = (body.observations || []) as FredObservation[];
  return observations
    .filter((o) => o.value !== ".")
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .reverse(); // oldest-first, easier for the frontend to plot as a trend
}

let cache: { data: unknown[]; fetchedAt: number; failedIds: string[] } | null = null;

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (!FRED_API_KEY) {
    return new Response(
      JSON.stringify({ error: "FRED_API_KEY is not configured on this function. Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html and run: supabase secrets set FRED_API_KEY=your_key" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  try {
    const fresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
    if (!fresh) {
      const settled = await Promise.allSettled(SERIES.map((s) => fetchSeries(s.id, 90)));
      const data: unknown[] = [];
      const failedIds: string[] = [];
      settled.forEach((result, i) => {
        const s = SERIES[i];
        if (result.status === "fulfilled") data.push({ id: s.id, label: s.label, unit: s.unit, history: result.value });
        else failedIds.push(s.id);
      });
      if (data.length === 0) throw new Error("All FRED series requests failed");
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
