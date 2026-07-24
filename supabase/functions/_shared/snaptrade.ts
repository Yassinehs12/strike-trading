// supabase/functions/_shared/snaptrade.ts
//
// Thin, dependency-free client for the SnapTrade REST API
// (https://docs.snaptrade.com), used instead of their SDK to keep this
// deployable as a plain Deno Edge Function. Every request must carry an
// HMAC-SHA256 signature computed from the consumer key — see
// https://docs.snaptrade.com/reference/request-signing before changing
// anything here, the exact JSON key order matters (it's part of what
// gets signed).
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   SNAPTRADE_CLIENT_ID     — public, identifies your app
//   SNAPTRADE_CONSUMER_KEY  — secret, signs every request; never log it

const SNAPTRADE_BASE_URL = "https://api.snaptrade.com/api/v1";

const CLIENT_ID = Deno.env.get("SNAPTRADE_CLIENT_ID");
const CONSUMER_KEY = Deno.env.get("SNAPTRADE_CONSUMER_KEY");

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeysDeep(v)])
    );
  }
  return value;
}

async function sign(content: unknown, path: string, query: string): Promise<string> {
  if (!CONSUMER_KEY) throw new Error("SNAPTRADE_CONSUMER_KEY is not configured on this function.");
  const sigObject = { content: content ?? null, path, query };
  const sigContent = JSON.stringify(sortKeysDeep(sigObject));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(CONSUMER_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sigContent));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

/**
 * Calls the SnapTrade API. `query` should NOT include clientId/timestamp —
 * those are added automatically since they're part of what gets signed.
 */
export async function snapTradeRequest(
  method: "GET" | "POST" | "DELETE" | "PUT",
  path: string, // e.g. "/accounts" or "/snapTrade/registerUser"
  { query = {}, body }: { query?: Record<string, string>; body?: unknown } = {}
) {
  if (!CLIENT_ID) throw new Error("SNAPTRADE_CLIENT_ID is not configured on this function.");

  const fullPath = `/api/v1${path}`;
  const params = new URLSearchParams({
    ...query,
    clientId: CLIENT_ID,
    timestamp: Math.floor(Date.now() / 1000).toString(),
  });
  // Signing requires the exact query string, sorted, that will be sent.
  params.sort();
  const queryString = params.toString();

  const signature = await sign(body, fullPath, queryString);

  const res = await fetch(`${SNAPTRADE_BASE_URL}${path}?${queryString}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Signature": signature,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "detail" in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).detail)
        : text) || `SnapTrade request failed (${res.status})`;
    const err = new Error(message) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
