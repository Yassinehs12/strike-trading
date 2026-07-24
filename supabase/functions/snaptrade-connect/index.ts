// supabase/functions/snaptrade-connect/index.ts
//
// Returns a redirect URL to SnapTrade's hosted Connection Portal, where
// the user logs into their real brokerage directly (OAuth-style) — we
// never see or touch their brokerage credentials.
//
// First call for a given user registers them with SnapTrade (one-time;
// the returned `userSecret` is stored in `snaptrade_users` and reused for
// every future request), then every call generates a fresh login link.
//
// Deploy with:
//   supabase functions deploy snaptrade-connect
// Secrets (from your SnapTrade dashboard, dashboard.snaptrade.com):
//   supabase secrets set SNAPTRADE_CLIENT_ID=your-client-id
//   supabase secrets set SNAPTRADE_CONSUMER_KEY=your-consumer-key
//
// This is a STUB with the real control flow in place, but response shapes
// should be checked against current docs (https://docs.snaptrade.com)
// before going live — confirm `registerUser` and `login` still return
// `userSecret` / `redirectURI` under those exact keys.

import { createClient } from "npm:@supabase/supabase-js@2";
import { snapTradeRequest, corsHeaders, json } from "../_shared/snaptrade.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated." }, 401);

    // snaptrade_users has NO row-level-security policies at all, by
    // design (see supabase-migrations/snaptrade.sql) — it holds a bearer
    // credential for the SnapTrade API and must never be reachable with
    // a user's own JWT, only from trusted server-side code using the
    // service role key, which bypasses RLS entirely.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const { broker, reconnectAuthorizationId } = body as { broker?: string; reconnectAuthorizationId?: string };

    // 1) Look up (or create) this user's SnapTrade registration. The
    //    SnapTrade userId is our Supabase user id — SnapTrade just needs
    //    something unique and stable per user, it doesn't have to be an
    //    email.
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("snaptrade_users")
      .select("snaptrade_user_id, snaptrade_user_secret")
      .eq("user_id", user.id)
      .maybeSingle();
    if (fetchError) return json({ error: fetchError.message }, 500);

    let snaptradeUserId = existing?.snaptrade_user_id;
    let snaptradeUserSecret = existing?.snaptrade_user_secret;

    if (!snaptradeUserId || !snaptradeUserSecret) {
      snaptradeUserId = user.id;
      let registerRes: { userId: string; userSecret: string };
      try {
        registerRes = await snapTradeRequest("POST", "/snapTrade/registerUser", {
          body: { userId: snaptradeUserId },
        }) as { userId: string; userSecret: string };
      } catch (registerErr) {
        // This happens if a previous attempt registered the user with
        // SnapTrade but crashed/errored before the userSecret was saved
        // to our own table — SnapTrade then refuses to re-register the
        // same userId, and we have no way to recover the original
        // secret (it's only ever returned once, at creation). The only
        // way out is to delete the orphaned SnapTrade user and recreate
        // it, which also means any brokerage connections made under
        // that orphaned registration are lost and must be reconnected.
        const message = (registerErr as Error).message || "";
        if (!/already exist/i.test(message)) throw registerErr;

        await snapTradeRequest("DELETE", "/snapTrade/deleteUser", {
          query: { userId: snaptradeUserId },
        });
        registerRes = await snapTradeRequest("POST", "/snapTrade/registerUser", {
          body: { userId: snaptradeUserId },
        }) as { userId: string; userSecret: string };
      }

      snaptradeUserSecret = registerRes.userSecret;

      const { error: insertError } = await supabaseAdmin.from("snaptrade_users").upsert({
        user_id: user.id,
        snaptrade_user_id: snaptradeUserId,
        snaptrade_user_secret: snaptradeUserSecret,
      });
      if (insertError) return json({ error: insertError.message }, 500);
    }

    // 2) Generate a fresh Connection Portal login link. Each link is
    //    single-use and short-lived, so this is always called on demand
    //    rather than cached.
    const loginRes = await snapTradeRequest("POST", "/snapTrade/login", {
      body: {
        userId: snaptradeUserId,
        userSecret: snaptradeUserSecret,
        broker: broker || undefined,
        reconnect: reconnectAuthorizationId || undefined,
        customRedirect: Deno.env.get("SNAPTRADE_REDIRECT_URL") || undefined,
      },
    }) as { redirectURI: string };

    return json({ redirectURI: loginRes.redirectURI });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    return json({ error: (err as Error).message || String(err) }, status && status < 500 ? status : 502);
  }
});
