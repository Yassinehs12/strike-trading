// Serves month-end closing rates for one currency pair, for the Seasonality
// page. The page computes returns/statistics from these closes.
//
// DATA SOURCE: ECB euro foreign exchange reference rates, fetched from the
// official ECB Data Portal (SDMX web service, dataset EXR). Free, no API key,
// no usage cap, daily history back to 4 Jan 1999. The ECB permits reuse of
// its statistics provided the source is acknowledged; the page shows that
// attribution. NOTE: these are once-a-day reference fixings (~14:15 CET) —
// not exchange or broker closes — and the ECB publishes them for information
// purposes only. Pairs not involving EUR are derived from two EUR legs.
//
// No secrets are involved (the ECB endpoint is keyless). If a keyed provider
// is ever swapped in, read the key with Deno.env.get() here — never ship it
// to the browser.
//
// Usage: GET /functions/v1/fx-seasonality?pair=EURUSD
//
// Caching: the parsed daily history for all supported currencies is held in
// instance memory for 6h (ECB publishes once per working day). If a refresh
// fails and an older copy exists it is served with `stale: true`.

import { SUPPORTED_CODES, crossSeries, monthEndCloses, parseEcbCsv, type DailyRates } from "../_shared/fx.ts";

const ECB_URL =
  "https://data-api.ecb.europa.eu/service/data/EXR/D." +
  SUPPORTED_CODES.filter((c) => c !== "EUR").join("+") +
  ".EUR.SP00.A?startPeriod=1999-01-01&format=csvdata";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 25_000;

// Public, read-only market data with no cookies or per-user content, so any
// origin may call it (avoids CORS failures on preview/custom domains).
function corsHeadersFor(_req: Request) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

let cache: { daily: DailyRates; fetchedAt: number } | null = null;
let inflight: Promise<{ daily: DailyRates; fetchedAt: number }> | null = null;

async function loadFromEcb() {
  const res = await fetch(ECB_URL, {
    headers: { Accept: "text/csv" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ECB Data Portal returned HTTP ${res.status}`);
  const daily = parseEcbCsv(await res.text());
  const missing = SUPPORTED_CODES.filter((c) => c !== "EUR" && !Object.keys(daily[c] || {}).length);
  if (missing.length) throw new Error(`ECB response had no data for: ${missing.join(", ")}`);
  return { daily, fetchedAt: Date.now() };
}

async function getDaily(): Promise<{ data: { daily: DailyRates; fetchedAt: number }; stale: boolean }> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return { data: cache, stale: false };
  try {
    inflight ||= loadFromEcb().finally(() => { inflight = null; });
    cache = await inflight;
    return { data: cache, stale: false };
  } catch (err) {
    if (cache) return { data: cache, stale: true }; // better an older copy than nothing
    throw err;
  }
}

function json(req: Request, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json", ...extra },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(req) });

  const pair = (new URL(req.url).searchParams.get("pair") || "").toUpperCase();
  const base = pair.slice(0, 3);
  const quote = pair.slice(3);
  if (!/^[A-Z]{6}$/.test(pair) || !SUPPORTED_CODES.includes(base) || !SUPPORTED_CODES.includes(quote) || base === quote) {
    return json(req, { error: `Unsupported pair "${pair}". Supported currencies: ${SUPPORTED_CODES.join(", ")}.` }, 400);
  }

  try {
    const { data, stale } = await getDaily();
    const series = crossSeries(data.daily, base, quote);
    if (!series.length) return json(req, { error: `No observations available for ${base}/${quote}.` }, 404);
    return json(
      req,
      {
        pair,
        base,
        quote,
        closes: monthEndCloses(series),
        firstObservation: series[0].date,
        lastObservation: series[series.length - 1].date,
        fetchedAt: data.fetchedAt,
        stale,
        provider: {
          name: "European Central Bank",
          dataset: "Euro foreign exchange reference rates (EXR, daily)",
          url: "https://data.ecb.europa.eu/data/datasets/EXR",
        },
      },
      200,
      { "Cache-Control": "public, max-age=1800" },
    );
  } catch (err) {
    return json(req, { error: `Could not load exchange-rate history from the ECB: ${String((err as Error)?.message || err)}` }, 502);
  }
});
