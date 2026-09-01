// Proxies MyFxBook's Community Outlook — retail long/short positioning
// per instrument, aggregated across MyFxBook's connected live accounts.
// This is the classic contrarian sentiment indicator: when retail is
// heavily positioned one way, price has a documented tendency to move
// the other way.
//
// MyFxBook's API is free but requires a real (free) account — there is no
// separate "API key", you authenticate with the same email/password you'd
// use to log into myfxbook.com. Create one at https://www.myfxbook.com,
// then:
//   supabase secrets set MYFXBOOK_EMAIL=your_email
//   supabase secrets set MYFXBOOK_PASSWORD=your_password
// Use a dedicated account for this rather than a personal trading
// account — this stores real login credentials as server secrets.
//
// Why a proxy: (1) credentials obviously can't go in browser code, and
// (2) MyFxBook's free tier caps get-community-outlook at 100 requests /
// 24h — sharing one server-side cached fetch across all of Strike
// Journal's visitors is the only way this scales past a handful of users.
//
// Session tokens are also cached (not just the outlook data) so a normal
// refresh doesn't spend one of the 100 daily calls on login.json too.

const EMAIL = Deno.env.get("MYFXBOOK_EMAIL");
const PASSWORD = Deno.env.get("MYFXBOOK_PASSWORD");

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — well inside the 100 req/24h free-tier budget (24 req/day worst case) while still feeling reasonably live
const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // sessions last well beyond this; re-login periodically rather than assuming an unlimited lifetime

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

type OutlookSymbol = {
  name: string;
  shortPercentage: number;
  longPercentage: number;
  shortVolume: number;
  longVolume: number;
  longPositions: number;
  shortPositions: number;
};

let session: { token: string; fetchedAt: number } | null = null;
let cache: { data: OutlookSymbol[]; fetchedAt: number } | null = null;

async function login(): Promise<string> {
  const params = new URLSearchParams({ email: EMAIL || "", password: PASSWORD || "" });
  const res = await fetch(`https://www.myfxbook.com/api/login.json?${params.toString()}`);
  const body = await res.json();
  if (body.error) throw new Error(`MyFxBook login failed: ${body.message}`);
  return body.session as string;
}

async function fetchOutlook(): Promise<OutlookSymbol[]> {
  const now = Date.now();
  if (!session || now - session.fetchedAt > SESSION_TTL_MS) {
    session = { token: await login(), fetchedAt: now };
  }

  let res = await fetch(`https://www.myfxbook.com/api/get-community-outlook.json?session=${session.token}`);
  let body = await res.json();

  // Session expired server-side before our local TTL guessed it would —
  // log in once more and retry, rather than failing the whole request.
  if (body.error && /session/i.test(body.message || "")) {
    session = { token: await login(), fetchedAt: Date.now() };
    res = await fetch(`https://www.myfxbook.com/api/get-community-outlook.json?session=${session.token}`);
    body = await res.json();
  }

  if (body.error) throw new Error(`MyFxBook outlook failed: ${body.message}`);
  return (body.symbols || []) as OutlookSymbol[];
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (!EMAIL || !PASSWORD) {
    return new Response(
      JSON.stringify({ error: "MYFXBOOK_EMAIL / MYFXBOOK_PASSWORD are not configured on this function. Create a free account at https://www.myfxbook.com and run: supabase secrets set MYFXBOOK_EMAIL=... MYFXBOOK_PASSWORD=..." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  try {
    const fresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
    if (!fresh) {
      const symbols = await fetchOutlook();
      cache = { data: symbols, fetchedAt: Date.now() };
    }

    return new Response(JSON.stringify({ symbols: cache!.data, cachedAt: cache!.fetchedAt }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (cache) {
      return new Response(JSON.stringify({ symbols: cache.data, cachedAt: cache.fetchedAt, stale: true }), {
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
