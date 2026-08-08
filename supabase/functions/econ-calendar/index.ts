// Proxies Forex Factory's public weekly economic calendar feed.
//
// Why a proxy instead of calling it from the browser: (1) it's not CORS-
// enabled for arbitrary origins, and (2) Forex Factory strictly rate-limits
// this endpoint to 2 requests / 5 minutes *per source IP* — calling it
// directly from every visitor's browser would blow through that limit
// almost immediately. Routing it through one server-side function means
// all of Strike Journal's traffic shares a single, cached fetch instead.
//
// Fetches "this week", covering Yesterday/Today/Tomorrow/This Week filters
// on the client. "Yesterday" can fall outside this feed right at a Monday
// boundary (it'd be in last week's feed, which isn't fetched, to avoid a
// 2nd request risking FF's rate limit) — a known, minor gap.
//
// This is Forex Factory's unofficial public export endpoint, widely used
// by trading tools/EAs — not a documented, guaranteed-stable API. If they
// change or block it, this function will start returning stale cache or
// errors; there's no SLA here.

// Fetches "this week" from Forex Factory's feed. An earlier version of
// this also tried ff_calendar_nextweek.json for a "Next Week" filter —
// removed because that URL was a guess (patterned off the confirmed-real
// thisweek.json) and turned out not to work. Forex Factory only reliably
// documents/serves the current week via this endpoint.
const FF_URLS = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
];
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — comfortably under FF's rate limit even with bursty traffic

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

// Module-scope cache — persists across requests handled by the same warm
// Deno isolate, but is NOT a guaranteed global cache (a cold start or a
// second concurrent isolate gets its own copy). Good enough to absorb
// normal traffic bursts; not a substitute for a real scheduled cache table
// if this ever needs to be bulletproof under heavy concurrent load.
let cache: { data: unknown[]; fetchedAt: number; failedUrls: string[] } | null = null;

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const fresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
    if (!fresh) {
      // Fetch each feed independently — thisweek.json is confirmed stable,
      // but nextweek.json is NOT a documented/verified endpoint (guessed
      // by pattern from thisweek). If it 404s or errors, that shouldn't
      // take down thisweek's data too.
      const settled = await Promise.allSettled(
        FF_URLS.map(async (url) => {
          const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; StrikeJournal/1.0)" } });
          if (!res.ok) throw new Error(`${url} returned ${res.status}`);
          const data = await res.json();
          if (!Array.isArray(data)) throw new Error(`${url} returned a non-array response`);
          return data;
        })
      );

      const merged: unknown[] = [];
      const failedUrls: string[] = [];
      settled.forEach((result, i) => {
        if (result.status === "fulfilled") merged.push(...result.value);
        else failedUrls.push(FF_URLS[i]);
      });

      if (merged.length === 0 && failedUrls.length === FF_URLS.length) {
        throw new Error("All Forex Factory feeds failed");
      }
      cache = { data: merged, fetchedAt: Date.now(), failedUrls };
    }

    return new Response(JSON.stringify({ events: cache!.data, cachedAt: cache!.fetchedAt, failedUrls: cache!.failedUrls }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Serve stale cache rather than nothing if the upstream fetch fails —
    // an economic calendar that's a few hours stale is far more useful
    // than a blank page.
    if (cache) {
      return new Response(JSON.stringify({ events: cache.data, cachedAt: cache.fetchedAt, stale: true, failedUrls: cache.failedUrls }), {
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
